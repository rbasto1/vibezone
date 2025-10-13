import { currentUser } from "@clerk/nextjs/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { Suspense, type PropsWithChildren } from "react";

import { StoreProvider } from "@/components/providers/store-provider";
import { Toaster } from "@/components/providers/toast-provider";
import { db } from "@/db";
import type { Model } from "@/db/schema";
import { models, preferences as preferencesTable } from "@/db/schema";
import { models as modelsList } from "@/generated/models";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import type { PanelConfig } from "@/store/panels";
import type { PreferencesAtom } from "@/store/preferences";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { generateId } from "ai";
import { getTranslations } from "next-intl/server";
import { PageLoader } from "./page-loader";

export default async function RootLayout({ children }: PropsWithChildren) {
  const authUser = await currentUser();
  const userId = authUser?.id;
  const preferences = userId
    ? await db.query.preferences.findFirst({
        where: eq(preferencesTable.userId, userId),
      })
    : undefined;

  const t = await getTranslations("Prompts");

  const caller = await getServerCaller();

  const state = await prefetch(caller, [
    caller.chats.listChats.prefetch({}),
    caller.users.favorites.prefetch(),
  ]);

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
  const fallbackModels = await getDefaultModels();
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
  return (
    <Suspense fallback={<PageLoader />}>
      <HydrationBoundary state={state}>
        <StoreProvider
          modelsInitialValue={modelsList}
          panelsInitialValue={initialPanels}
          preferencesInitialValue={preferencesInitialValue}
        >
          {children}
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
async function getDefaultModels() {
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
