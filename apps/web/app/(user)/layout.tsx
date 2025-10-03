import { HydrationBoundary } from "@tanstack/react-query";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { Suspense, type PropsWithChildren } from "react";

import { StoreProvider } from "@/components/providers/store-provider";
import { db } from "@/db";
import type { Model } from "@/db/schema";
import { models, user as userTable } from "@/db/schema";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import type { PanelConfig } from "@/store/panels";

import { Toaster } from "@/components/providers/toast-provider";
import { models as modelsList } from "@/generated/models";
import { auth } from "@/lib/auth";
import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import type { PreferencesAtom } from "@/store/preferences";
import { generateId } from "ai";
import { getTranslations } from "next-intl/server";
import { PageLoader } from "./page-loader";

export default async function RootLayout({ children }: PropsWithChildren) {
  const session = await auth.api.getSession({ headers: await headers() });
  const t = await getTranslations("Prompts");
  const user = session?.user;
  const userId = user?.id;

  const caller = await getServerCaller();
  const state = await prefetch(caller, [caller.chats.listChats.prefetch()]);

  let lastModels: string[] = [];
  const hiddenProviders = new Set<string>();

  if (userId) {
    const [
      { lastModels: userLastModels, hiddenProviders: userHiddenProviders } = {},
    ] = await db
      .select({
        lastModels: userTable.lastModels,
        hiddenProviders: userTable.preferenceHiddenProviders,
      })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    lastModels = userLastModels ?? [];
    for (const providerId of userHiddenProviders ?? []) {
      hiddenProviders.add(providerId);
    }
  }

  const changedPrompt = !!user?.preferenceSystemPromptChangedAt;
  const preferencesInitialValue: PreferencesAtom = userId
    ? {
        pluginWeb: user?.preferenceWebSearch,
        systemPrompt: changedPrompt
          ? (user?.preferenceSystemPrompt ?? null)
          : t("system"),
        changedPrompt,
        autoScroll: user?.preferenceAutoScroll,
        hiddenProviders: user?.preferenceHiddenProviders ?? [],
      }
    : {
        pluginWeb: true,
        systemPrompt: t("system"),
        changedPrompt: false,
        autoScroll: false,
        hiddenProviders: [],
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
      initialMessages: preferencesInitialValue.systemPrompt
        ? [
            {
              id: generateId(),
              role: "system",
              parts: [
                {
                  type: "text",
                  text: preferencesInitialValue.systemPrompt,
                },
              ],
            },
          ]
        : [],
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
