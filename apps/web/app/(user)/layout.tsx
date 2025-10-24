import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense, type PropsWithChildren } from "react";

import { WhatsNewModal } from "@/components/news/whats-new-modal";
import { StoreProvider } from "@/components/providers/store-provider";
import { Toaster } from "@/components/providers/toast-provider";
import { models as modelsList } from "@/generated/models";
import { generateThreadId } from "@/lib/id";
import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import type { PanelConfig } from "@/store/panels";
import type { PreferencesAtom } from "@/store/preferences";
import {
  GetUserModels,
  buildInitialMessages,
  ensureGeneralProject,
  ensurePreferences,
  getDefaultModels,
  getRecentNews,
  getUserPreferredModels,
  loadProjects,
} from "./layout-queries";
import { PageLoader } from "./page-loader";

export default async function RootLayout({ children }: PropsWithChildren) {
  const tPromise = getTranslations("Prompts");
  const localePromise = getLocale();

  const authUser = await currentUser();
  const userId = authUser?.id;
  const preferencesPromise = ensurePreferences(userId);

  const statePromise = userId
    ? getServerCaller().then((caller) =>
        prefetch(caller, [
          caller.chats.listChats.prefetchInfinite({ projectId: userId }),
          caller.projects.list.prefetch(),
          caller.users.favorites.prefetch(),
        ])
      )
    : null;

  const { lastModels, hiddenProviders } = await GetUserModels(userId);

  const t = await tPromise;
  await ensureGeneralProject(userId, t("generalProjectName"));

  const projectsInitialValuePromise = loadProjects(userId);

  const [preferences, locale, projectsInitialValue] = await Promise.all([
    preferencesPromise,
    localePromise,
    projectsInitialValuePromise,
  ]);
  const recentNewsPromise = getRecentNews(preferences?.lastNewsSeenAt, locale);

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
