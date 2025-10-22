import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { generateId } from "ai";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense, type PropsWithChildren } from "react";

import { WhatsNewModal } from "@/components/news/whats-new-modal";
import { StoreProvider } from "@/components/providers/store-provider";
import { Toaster } from "@/components/providers/toast-provider";
import { db } from "@/db";
import type { Model } from "@/db/schema";
import {
  chats,
  models,
  newsArticles,
  preferences as preferencesTable,
  projects as projectsTable,
} from "@/db/schema";
import { models as modelsList } from "@/generated/models";
import {
  DEFAULT_PROJECT_COLOR,
  MAX_PANELS,
  NEWS_WINDOW_MS,
} from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import type { PanelConfig } from "@/store/panels";
import type { PreferencesAtom } from "@/store/preferences";
import type { ProjectConfig } from "@/store/projects";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { PageLoader } from "./page-loader";

export default async function RootLayout({ children }: PropsWithChildren) {
  const tPromise = getTranslations("Prompts");
  const localePromise = getLocale();

  const authUser = await currentUser();
  const userId = authUser?.id;
  const preferencesPromise = ensurePreferences(userId);
  const generalProjectPromise = ensureGeneralProject(userId);

  const statePromise = userId
    ? getServerCaller().then((caller) =>
        prefetch(caller, [
          caller.chats.listChats.prefetchInfinite({ projectId: userId }),
          caller.projects.list.prefetch(),
          caller.users.favorites.prefetch(),
        ])
      )
    : null;

  let lastModels: string[] = [];
  const hiddenProviders = new Set<string>();

  if (userId) {
    const [
      { lastModels: userLastModels, hiddenProviders: userHiddenProviders } = {},
    ] = await db
      .select({
        lastModels: preferencesTable.lastModels,
        hiddenProviders: preferencesTable.preferenceHiddenProviders,
      })
      .from(preferencesTable)
      .where(eq(preferencesTable.userId, userId))
      .limit(1);

    lastModels = userLastModels ?? [];
    for (const providerId of userHiddenProviders ?? []) {
      hiddenProviders.add(providerId);
    }
  }

  await generalProjectPromise;

  const projectsInitialValuePromise = loadProjects(userId);

  const [preferences, locale, projectsInitialValue] = await Promise.all([
    preferencesPromise,
    localePromise,
    projectsInitialValuePromise,
  ]);
  const recentNewsPromise = getRecentNews(preferences?.lastNewsSeenAt, locale);
  const t = await tPromise;

  const changedPrompt = !!preferences?.preferenceSystemPromptChangedAt;
  const preferencesInitialValue: PreferencesAtom = preferences
    ? {
        pluginWeb: preferences?.preferenceWebSearch,
        reasoningEffort: preferences?.preferenceReasoningEffort as
          | "none"
          | "low"
          | "medium"
          | "high",
        systemPrompt: changedPrompt
          ? (preferences?.preferenceSystemPrompt ?? null)
          : t("system"),
        changedPrompt,
        autoScroll: preferences?.preferenceAutoScroll,
        hiddenProviders: preferences?.preferenceHiddenProviders ?? [],
        skipCloseThreadConfirmation:
          preferences?.preferenceSkipCloseThreadConfirmation ?? false,
      }
    : {
        pluginWeb: true,
        reasoningEffort: "low",
        systemPrompt: t("system"),
        changedPrompt: false,
        autoScroll: false,
        hiddenProviders: [],
        skipCloseThreadConfirmation: false,
      };

  // Load all the state we will pass to the client side store
  const userModelList = await getUserPreferredModels(
    lastModels,
    hiddenProviders
  );
  const fallbackModels = getDefaultModels();

  const modelListForPanels = userModelList ?? fallbackModels;

  const initialPanels = modelListForPanels.map(
    (r, order): PanelConfig => ({
      id: generateThreadId(order),
      provider: r.providerId,
      model: r.id,
      initialMessages: buildInitialMessages(
        preferencesInitialValue.systemPrompt
      ),
    })
  );

  const [state, recentNews] = await Promise.all([
    statePromise,
    recentNewsPromise,
  ]);

  return (
    <Suspense fallback={<PageLoader />}>
      <HydrationBoundary state={state}>
        <StoreProvider
          modelsInitialValue={modelsList}
          panelsInitialValue={initialPanels}
          preferencesInitialValue={preferencesInitialValue}
          projectsInitialValue={projectsInitialValue}
        >
          {children}
          <WhatsNewModal
            items={recentNews}
            lastNewsSeenAt={preferences?.lastNewsSeenAt ?? null}
          />
        </StoreProvider>
        <Toaster />
      </HydrationBoundary>
    </Suspense>
  );
}

async function getUserPreferredModels(
  lastModels: string[] | null | undefined,
  hiddenProviders: Set<string>
) {
  if (!lastModels?.length) return null;

  // Fetch only existing chat models, keep user order and limit to MAX_PANELS
  const candidates = await db
    .select({ id: models.id, providerId: models.providerId })
    .from(models)
    .where(
      and(
        inArray(models.id, lastModels),
        isNull(models.deletedAt),
        isNull(models.hiddenAt),
        eq(models.isChat, true)
      )
    );
  const byId = new Map(candidates.map((m) => [m.id, m]));
  const ordered = lastModels
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .filter((model) => !hiddenProviders.has(model.providerId))
    .slice(0, MAX_PANELS);
  if (!ordered.length) {
    return null;
  }

  return ordered;
}

let defaultModelsCache: Pick<Model, "id" | "providerId">[] | null = null;
function getDefaultModels() {
  defaultModelsCache ??= modelsList.models
    .filter((m) => !!m.priority)
    .toSorted((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .slice(0, MAX_PANELS);
  return defaultModelsCache;
}

const buildInitialMessages = (
  prompt: string | null | undefined
): ThreadMessageLike[] => {
  if (!prompt) return [];
  return [
    {
      id: generateId(),
      role: "system" as const,
      createdAt: new Date(),
      content: [
        {
          type: "text" as const,
          text: prompt,
        },
      ],
      metadata: { custom: {} },
    } satisfies ThreadMessageLike,
  ];
};

async function loadProjects(
  userId: string | null | undefined
): Promise<ProjectConfig[]> {
  if (!userId) return [];

  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      color: projectsTable.color,
      instructions: projectsTable.instructions,
      isDefault: sql<boolean>`${projectsTable.id} = ${userId}`,
      createdAt: projectsTable.createdAt,
    })
    .from(projectsTable)
    .leftJoin(
      chats,
      and(
        eq(chats.projectId, projectsTable.id),
        isNull(chats.deletedAt),
        eq(chats.isArchived, false)
      )
    )
    .where(
      and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt))
    )
    .groupBy(
      projectsTable.id,
      projectsTable.name,
      projectsTable.color,
      projectsTable.instructions,
      projectsTable.createdAt
    )
    .orderBy(asc(projectsTable.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    instructions: row.instructions,
    isDefault: row.isDefault,
  }));
}

async function ensurePreferences(userId: string | null | undefined) {
  if (!userId) return null;

  const row = await db.query.preferences.findFirst({
    where: eq(preferencesTable.userId, userId),
  });

  if (!row) {
    return await db
      .insert(preferencesTable)
      .values({ userId })
      .returning()
      .then((rows) => rows[0]);
  }

  return row;
}

async function ensureGeneralProject(userId: string | null | undefined) {
  if (!userId) return null;

  const existing = await db.query.projects.findFirst({
    where: eq(projectsTable.id, userId),
  });

  if (existing && !existing.deletedAt) {
    return existing;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      id: userId,
      userId,
      name: "General",
      color: DEFAULT_PROJECT_COLOR,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: projectsTable.id,
      set: {
        name: "General",
        color: DEFAULT_PROJECT_COLOR,
        deletedAt: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return project ?? null;
}

async function getRecentNews(
  lastSeenAt: Date | null | undefined,
  locale: string
) {
  const oldest = new Date(Date.now() - NEWS_WINDOW_MS);
  const cutoff = !lastSeenAt || lastSeenAt < oldest ? oldest : lastSeenAt;

  const rows = await db
    .select({
      id: newsArticles.id,
      titleText: sql<string>`title->>${locale}`,
      bodyText: sql<string>`body->>${locale}`,
      createdAt: newsArticles.createdAt,
    })
    .from(newsArticles)
    .where(
      and(
        isNull(newsArticles.deletedAt),
        gt(newsArticles.createdAt, cutoff),
        sql<boolean>`title->>${locale} IS NOT NULL`,
        sql<boolean>`body->>${locale} IS NOT NULL`
      )
    )
    .orderBy(desc(newsArticles.createdAt))
    .catch((error) => {
      console.error("Failed to load recent news:", error);
      throw error instanceof Error ? error : new Error(String(error));
    });

  return rows;
}
