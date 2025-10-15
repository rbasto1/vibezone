import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { generateId } from "ai";
import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Suspense, type PropsWithChildren } from "react";

import { WhatsNewModal } from "@/components/news/whats-new-modal";
import { StoreProvider } from "@/components/providers/store-provider";
import { Toaster } from "@/components/providers/toast-provider";
import { db } from "@/db";
import type { Model } from "@/db/schema";
import { models, news, preferences as preferencesTable } from "@/db/schema";
import { models as modelsList } from "@/generated/models";
import { MAX_PANELS, NEWS_WINDOW_MS } from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import type { PanelConfig } from "@/store/panels";
import type { PreferencesAtom } from "@/store/preferences";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { PageLoader } from "./page-loader";

export default async function RootLayout({ children }: PropsWithChildren) {
  const tPromise = getTranslations("Prompts");

  const authUser = await currentUser();
  const userId = authUser?.id;
  const preferencesPromise = ensurePreferences(userId);

  const statePromise = getServerCaller().then((caller) =>
    prefetch(caller, [
      caller.chats.listChats.prefetch({}),
      caller.users.favorites.prefetch(),
    ])
  );

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

  const preferences = await preferencesPromise;
  const recentNewsPromise = getRecentNews(preferences?.lastNewsSeenAt);
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

async function getRecentNews(lastSeenAt: Date | null | undefined) {
  const oldest = new Date(Date.now() - NEWS_WINDOW_MS);
  const cutoff = !lastSeenAt || lastSeenAt < oldest ? oldest : lastSeenAt;

  const rows = await db
    .select({
      id: news.id,
      title: news.title,
      body: news.body,
      createdAt: news.createdAt,
    })
    .from(news)
    .where(and(isNull(news.deletedAt), gt(news.createdAt, cutoff)))
    .orderBy(desc(news.createdAt))
    .catch((error) => {
      console.error("Failed to load recent news:", error);
      throw error instanceof Error ? error : new Error(String(error));
    });

  return rows;
}
