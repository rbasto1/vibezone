import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense, type PropsWithChildren } from "react";

import { WhatsNewModal } from "@/components/news/whats-new-modal";
import { StoreProvider } from "@/components/providers/store-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { models as modelsList } from "@/generated/models";
import { generateThreadId } from "@/lib/id";
import { composeInstructionPrompt } from "@/lib/instructions";
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
  loadInstructions,
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
  await ensureGeneralProject(authUser, t("generalProjectName"));

  const projectsInitialValuePromise = loadProjects(userId);
  const instructionsInitialValuePromise = loadInstructions(userId);

  const [preferences, locale, projectsInitialValue, instructionsInitialValue] =
    await Promise.all([
      preferencesPromise,
      localePromise,
      projectsInitialValuePromise,
      instructionsInitialValuePromise,
    ]);
  const recentNewsPromise = getRecentNews(preferences?.lastNewsSeenAt, locale);

  const baseSystemPrompt = t("system");
  const preferencesInitialValue: PreferencesAtom = preferences
    ? {
        webSearch: preferences?.preferenceWebSearch,
        reasoningEffort: preferences?.preferenceReasoningEffort as
          | "none"
          | "low"
          | "medium"
          | "high",
        autoScroll: preferences?.preferenceAutoScroll,
        hiddenProviders: preferences?.preferenceHiddenProviders ?? [],
        enterKeySends: preferences?.preferenceEnterKeySends ?? true,
        shiftEnterKeySends: preferences?.preferenceShiftEnterKeySends ?? false,
        skipCloseThreadConfirmation:
          preferences?.preferenceSkipCloseThreadConfirmation ?? false,
        hideLegal: preferences?.preferenceHideLegal ?? false,
      }
    : {
        webSearch: true,
        reasoningEffort: "low",
        autoScroll: false,
        hiddenProviders: [],
        enterKeySends: true,
        shiftEnterKeySends: false,
        skipCloseThreadConfirmation: false,
        hideLegal: false,
      };

  // Load all the state we will pass to the client side store
  const userModelList = await getUserPreferredModels(
    lastModels,
    hiddenProviders
  );
  const fallbackModels = getDefaultModels();

  const modelListForPanels = userModelList ?? fallbackModels;
  const defaultProjectId =
    projectsInitialValue.find((project) => project.isDefault)?.id ??
    projectsInitialValue[0]?.id ??
    null;
  const persistedProjectId =
    preferences?.lastProjectId &&
    projectsInitialValue.some(
      (project) => project.id === preferences.lastProjectId
    )
      ? preferences.lastProjectId
      : null;
  const initialProjectId = persistedProjectId ?? defaultProjectId;
  const initialPromptResult = composeInstructionPrompt(
    baseSystemPrompt,
    instructionsInitialValue,
    initialProjectId,
    projectsInitialValue
  );

  const initialPanels = modelListForPanels.map(
    (r, order): PanelConfig => ({
      id: generateThreadId(order),
      provider: r.providerId,
      model: r.id,
      initialMessages: buildInitialMessages(
        initialPromptResult.prompt,
        initialPromptResult.instructions
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
          instructionsInitialValue={instructionsInitialValue}
          initialProjectId={initialProjectId}
        >
          <TooltipProvider>
            {children}
            <WhatsNewModal
              items={recentNews}
              lastNewsSeenAt={preferences?.lastNewsSeenAt ?? null}
            />
          </TooltipProvider>
        </StoreProvider>
      </HydrationBoundary>
    </Suspense>
  );
}
