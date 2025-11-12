import { useSetAtom } from "jotai";
import { type FC, useEffect, useState } from "react";

import { AnonQuotaBanner } from "@/components/assistant-ui/anon-quota-banner";
import { GlobalComposer } from "@/components/assistant-ui/global-composer";
import { MobileThreadTabButtons } from "@/components/assistant-ui/threads/mobile-thread-tab-buttons";
import { ThreadPanel } from "@/components/assistant-ui/threads/thread-panel";
import { ThreadWelcomeSuggestions } from "@/components/assistant-ui/threads/thread-welcome-suggestions";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/ui/client-only";
import { cn } from "@/components/ui/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePanelsConfigValue, usePanelsStateValue } from "@/hooks/use-panels";
import { useUIState } from "@/hooks/use-ui-state";
import { useUser } from "@/lib/auth-client";
import { LEGAL_HIDE_STORAGE_KEY, MAX_PANELS } from "@/lib/constants";
import { modelMap } from "@/lib/model-map";
import {
  createDefaultModelSelectionState,
  modelSelectionStateAtom,
} from "@/store/model-selection-state";
import { AppFooter } from "./app-footer";

interface AppChatProps {
  hide: boolean;
  focusPanelId: string | undefined;
}

export const AppChat: FC<AppChatProps> = ({ hide, focusPanelId }) => {
  const panelsConfig = usePanelsConfigValue();
  const panelsState = usePanelsStateValue();
  const [uiState, setUIState] = useUIState();
  const isMobile = useIsMobile();
  const user = useUser();
  const setModelSelectionState = useSetAtom(modelSelectionStateAtom);
  const [sessionHideLegal, setSessionHideLegal] = useState(false);
  const removeFocus = focusPanelId
    ? () => setUIState({ focusPanelId: undefined })
    : undefined;

  const panelCount = Math.min(Math.max(panelsConfig.length, 1), MAX_PANELS);
  const hideAnonBanner = !!user || (isMobile && uiState.suggestionsUsed);
  const canToggleFocus = !isMobile && panelsConfig.length > 1;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(LEGAL_HIDE_STORAGE_KEY);
    if (stored === "true") {
      setSessionHideLegal(true);
    }
  }, []);

  const handleSuggestionClick = (groupId: string) => {
    setModelSelectionState(() => {
      const next = createDefaultModelSelectionState();
      next.selectedSuggestionGroup = groupId;
      return next;
    });
    setUIState((prev) => ({
      ...prev,
      modelPicker: { type: "suggestion" },
    }));
  };

  const showTabs = isMobile && panelsConfig.length > 1;

  return (
    <div
      className={cn(
        "flex-1 overflow-hidden flex flex-col gap-2",
        hide && "hidden"
      )}
    >
      <div className="px-3 flex-1 flex flex-col gap-0">
        <div className="flex flex-col gap-1 flex-1 min-h-0">
          {showTabs && <MobileThreadTabButtons focusPanelId={focusPanelId} />}
          <div
            className={cn(
              "flex-1 min-h-0",
              !isMobile && "grid gap-3  auto-rows-fr w-full",
              !isMobile && panelCount === 1 && "grid-cols-1",
              !isMobile && panelCount === 2 && "md:grid-cols-2",
              !isMobile && panelCount === 3 && "md:grid-cols-3"
            )}
          >
            {panelsConfig.map((panel) => {
              const isFocused = focusPanelId === panel.id;
              const isDimmed =
                Boolean(focusPanelId) && focusPanelId !== panel.id;
              const focusSwitchButtons =
                canToggleFocus && focusPanelId === panel.id
                  ? panelsConfig
                      .filter((candidate) => candidate.id !== panel.id)
                      .map((candidate) => {
                        const label =
                          modelMap.get(candidate.model)?.name ??
                          candidate.model;
                        const isRunning = panelsState[candidate.id]?.running;
                        return (
                          <Button
                            key={candidate.id}
                            onClick={() =>
                              setUIState({ focusPanelId: candidate.id })
                            }
                            variant="outline"
                            className={cn(
                              "bg-background/80 h-7 px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                              isRunning && "panel-button-glow"
                            )}
                          >
                            {label}
                          </Button>
                        );
                      })
                  : null;
              return (
                <ThreadPanel
                  key={panel.id}
                  panel={panel}
                  isFocused={isFocused}
                  focusSwitchButtons={focusSwitchButtons}
                  onToggleFocus={
                    canToggleFocus
                      ? () =>
                          setUIState(({ focusPanelId }) => ({
                            focusPanelId:
                              focusPanelId === panel.id ? undefined : panel.id,
                          }))
                      : undefined
                  }
                  className={cn(
                    "transition-all duration-300",
                    isDimmed && "hidden",
                    isFocused && "md:col-span-full"
                  )}
                />
              );
            })}
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl flex flex-col gap-3 px-2 sm:px-3">
          {/* Guest quota banner */}
          {!hideAnonBanner && (
            <ClientOnly>
              <AnonQuotaBanner />
            </ClientOnly>
          )}

          {/* Global model suggestions under panels */}
          {!uiState.suggestionsUsed && (
            <ThreadWelcomeSuggestions onSelectGroup={handleSuggestionClick} />
          )}
        </div>
      </div>

      <div className="overflow-hidden sm:px-3 flex flex-col">
        <div className="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl flex flex-col gap-3 sm:px-3">
          <GlobalComposer
            onAddPanel={removeFocus}
            footerHidden={sessionHideLegal}
          />
        </div>

        {!sessionHideLegal && (
          <AppFooter
            isLoggedIn={!!user}
            onHide={() => setSessionHideLegal(true)}
          />
        )}
      </div>
    </div>
  );
};
