"use client";

import { useTranslations } from "next-intl";
import { useSetAtom } from "jotai";
import { type FC, useState } from "react";

import { AnonQuotaBanner } from "@/components/assistant-ui/anon-quota-banner";
import { GlobalComposer } from "@/components/assistant-ui/global-composer";
import { ModelDropdownContents } from "@/components/assistant-ui/model-dropdown-contents";
import { ThreadPanel } from "@/components/assistant-ui/thread-panel";
import { ThreadWelcomeSuggestions } from "@/components/assistant-ui/thread-welcome-suggestions";
import { ClientOnly } from "@/components/ui/client-only";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/components/ui/utils";
import { useFocusPanelIdValue } from "@/hooks/use-focus-panel";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  usePanelsConfig,
  usePanelsStateSetter,
  usePanelsStateValue,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { useUIState } from "@/hooks/use-ui-state";
import { useUser } from "@/lib/auth-client";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import { modelMap } from "@/lib/model-map";
import {
  createDefaultModelSelectionState,
  modelSelectionStateAtom,
} from "@/store/model-selection-state";
import type { PanelConfig } from "@/store/panels";
import { AppFooter } from "./app-footer";

interface AppThreadsProps {
  hide: boolean;
  onAddPanel?: (id: string) => void;
}

export const AppThreads: FC<AppThreadsProps> = ({ hide, onAddPanel }) => {
  const t = useTranslations("Assistant");
  const [panelsConfig, setPanelsConfig] = usePanelsConfig();
  const panelsState = usePanelsStateValue();
  const setPanelsState = usePanelsStateSetter();
  const focusPanelId = useFocusPanelIdValue();
  const [uiState, setUIState] = useUIState();
  const isMobile = useIsMobile();
  const user = useUser();
  const saveLastModels = useSaveLastModels();
  const setModelSelectionState = useSetAtom(modelSelectionStateAtom);
  const [isSuggestionPickerOpen, setSuggestionPickerOpen] = useState(false);

  const panelCount = Math.min(Math.max(panelsConfig.length, 1), MAX_PANELS);
  const showTabs = isMobile && panelsConfig.length > 1;
  const hideAnonBanner = !!user || (isMobile && uiState.suggestionsUsed);
  const canToggleFocus = !isMobile && panelsConfig.length > 1;

  const handleSuggestionClick = (groupId: string) => {
    setModelSelectionState(() => {
      const next = createDefaultModelSelectionState();
      next.selectedSuggestionGroup = groupId;
      return next;
    });
    setSuggestionPickerOpen(true);
  };

  const handleSuggestionModelSelect = (providerId: string, modelId: string) => {
    setPanelsConfig((prevPanels) => {
      if (!prevPanels.length) {
        const newPanelId = generateThreadId(0);
        const newPanel: PanelConfig = {
          id: newPanelId,
          provider: providerId,
          model: modelId,
        };
        saveLastModels([newPanel]);
        setPanelsState((currentState) => ({
          ...currentState,
          [newPanelId]:
            currentState[newPanelId] ?? {
              running: false,
              hasMessages: false,
            },
        }));
        onAddPanel?.(newPanelId);
        return [newPanel];
      }

      const nextPanels = prevPanels.map((panel, index) =>
        index === 0
          ? {
              ...panel,
              provider: providerId,
              model: modelId,
            }
          : panel
      );
      saveLastModels(nextPanels);
      return nextPanels;
    });

    setSuggestionPickerOpen(false);
    setUIState({ suggestionsUsed: true });
  };

  return (
    <div
      className={cn(
        "flex-1 overflow-hidden px-3 flex flex-col gap-0",
        hide && "hidden"
      )}
    >
      <div className="flex flex-col gap-1 flex-1 min-h-0">
        {showTabs && (
          <div className="-mx-1 px-1">
            <div
              className="flex items-center border-b border-border rounded-t-md overflow-hidden"
              role="tablist"
            >
              {panelsConfig.map((panel, index) => {
                const modelLabel =
                  modelMap.get(panel.model)?.name ?? panel.model;
                const label = t("panelTabLabel", {
                  index: index + 1,
                  modelName: modelLabel,
                });
                const isActive = focusPanelId === panel.id;
                const isRunning = panelsState[panel.id]?.running;
                return (
                  <div
                    key={panel.id}
                    className={cn(
                      "relative flex-1 basis-1/3 min-w-0",
                      isActive
                        ? "border-b-2 border-primary"
                        : "border-b-2 border-transparent hover:border-border"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setUIState({ focusPanelId: panel.id })}
                      className={cn(
                        "relative w-full h-full px-3 py-2 text-sm font-medium truncate transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                        isActive
                          ? "text-foreground bg-background"
                          : "text-muted-foreground hover:text-foreground",
                        isRunning && "panel-button-glow"
                      )}
                      aria-pressed={isActive}
                      aria-selected={isActive}
                      aria-label={t("panelAriaLabel", { index: index + 1 })}
                      role="tab"
                    >
                      <span className="text">{label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
            const isDimmed = Boolean(focusPanelId) && focusPanelId !== panel.id;
            return (
              <ThreadPanel
                key={panel.id}
                panel={panel}
                isFocused={isFocused}
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

      {/* Centered container for suggestions and composer */}
      <div className="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl flex flex-col gap-3 px-2 sm:px-3">
        {/* Guest quota banner */}
        {!hideAnonBanner && (
          <ClientOnly>
            <AnonQuotaBanner />
          </ClientOnly>
        )}
        {/* Global suggestions under panels - only show if not used */}
        {!uiState.suggestionsUsed && (
          <ThreadWelcomeSuggestions onSelectGroup={handleSuggestionClick} />
        )}
        {/* Global composer below panels */}
        <GlobalComposer onAddPanel={onAddPanel} />
      </div>
      {isMobile ? (
        <Sheet open={isSuggestionPickerOpen} onOpenChange={setSuggestionPickerOpen}>
          <SheetContent
            side="bottom"
            className="h-[100dvh] w-screen gap-0 p-0"
          >
            <ModelDropdownContents
              onSelect={handleSuggestionModelSelect}
              currentModelId={panelsConfig[0]?.model}
              onClose={() => setSuggestionPickerOpen(false)}
              variant="sheet"
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isSuggestionPickerOpen} onOpenChange={setSuggestionPickerOpen}>
          <DialogContent className="max-w-[min(1200px,95vw)] w-[min(1200px,95vw)] h-[min(85vh,720px)] p-0 overflow-hidden">
            <ModelDropdownContents
              onSelect={handleSuggestionModelSelect}
              currentModelId={panelsConfig[0]?.model}
              onClose={() => setSuggestionPickerOpen(false)}
              variant="modal"
            />
          </DialogContent>
        </Dialog>
      )}
      <AppFooter isLoggedIn={!!user} />
    </div>
  );
};
