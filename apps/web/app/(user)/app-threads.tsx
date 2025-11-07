"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { type FC, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AnonQuotaBanner } from "@/components/assistant-ui/anon-quota-banner";
import { GlobalComposer } from "@/components/assistant-ui/global-composer";
import { ModelDropdownContents } from "@/components/assistant-ui/model-dropdown-contents";
import { ThreadPanel } from "@/components/assistant-ui/thread-panel";
import { ThreadWelcomeSuggestions } from "@/components/assistant-ui/thread-welcome-suggestions";
import { ClientOnly } from "@/components/ui/client-only";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/components/ui/utils";
import { useCurrentChatValue } from "@/hooks/use-chat";
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
import { LEGAL_HIDE_STORAGE_KEY, MAX_PANELS } from "@/lib/constants";
import { generateThreadId, getNextThreadOrderFromExisting } from "@/lib/id";
import { modelMap } from "@/lib/model-map";
import { trpc } from "@/lib/trpc/client";
import {
  createDefaultModelSelectionState,
  modelSelectionStateAtom,
} from "@/store/model-selection-state";
import type { PanelConfig } from "@/store/panels";
import { threadMessagesAtom } from "@/store/thread-messages";
import type { ThreadMessageLike } from "@assistant-ui/react";
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
  const [sessionHideLegal, setSessionHideLegal] = useState(false);
  const threadMessages = useAtomValue(threadMessagesAtom);
  const setThreadMessages = useSetAtom(threadMessagesAtom);
  const duplicateThreadMutation = trpc.messages.duplicateThread.useMutation();
  const currentChat = useCurrentChatValue();
  const currentChatId = currentChat.addedToList
    ? (currentChat?.id ?? null)
    : null;
  const modelPicker = uiState.modelPicker;
  const panelActionsT = useTranslations("ResponsePanelHeader");

  const panelCount = Math.min(Math.max(panelsConfig.length, 1), MAX_PANELS);
  const showTabs = isMobile && panelsConfig.length > 1;
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

  const handleModelPickerClose = useCallback(() => {
    setUIState((prev) => ({ ...prev, modelPicker: null }));
  }, [setUIState]);

  const cloneThreadMessages = useCallback((messages?: ThreadMessageLike[]) => {
    if (!messages?.length) return undefined;
    return messages.map((message): typeof message => ({
      ...message,
      metadata: {
        ...message.metadata,
        custom: {
          ...message.metadata?.custom,
          saved: true,
          rate: undefined,
        },
      },
    }));
  }, []);

  const getPanelMessages = useCallback(
    (panelId: string): ThreadMessageLike[] => {
      const stored = threadMessages[panelId];
      if (stored?.length) {
        return stored;
      }
      const panel = panelsConfig.find((p) => p.id === panelId);
      return panel?.initialMessages ?? [];
    },
    [panelsConfig, threadMessages]
  );

  const handleModelPickerSelect = useCallback(
    (providerId: string, modelId: string) => {
      const picker = modelPicker;
      if (!picker) return;

      if (picker.type === "suggestion") {
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
              [newPanelId]: currentState[newPanelId] ?? {
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

        setUIState((prev) => ({
          ...prev,
          suggestionsUsed: true,
          modelPicker: null,
        }));
        return;
      }

      if (picker.type === "thread-change") {
        setPanelsConfig((prevPanels) => {
          const nextPanels = prevPanels.map((panel) =>
            panel.id === picker.panelId
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
        setUIState((prev) => ({ ...prev, modelPicker: null }));
        return;
      }

      if (picker.type === "thread-duplicate") {
        if (panelsConfig.length >= MAX_PANELS) {
          toast.error(
            panelActionsT("toasts.duplicateLimit", { max: MAX_PANELS })
          );
          setUIState((prev) => ({ ...prev, modelPicker: null }));
          return;
        }

        const sourcePanelId = picker.panelId;
        const sourcePanel = panelsConfig.find(
          (panel) => panel.id === sourcePanelId
        );
        if (!sourcePanel) {
          toast.error(panelActionsT("toasts.duplicateMissing"));
          setUIState((prev) => ({ ...prev, modelPicker: null }));
          return;
        }

        const newPanelId = generateThreadId(
          getNextThreadOrderFromExisting(panelsConfig)
        );
        const initialMessages = cloneThreadMessages(
          getPanelMessages(sourcePanelId)
        );

        const newPanel: PanelConfig = {
          id: newPanelId,
          provider: providerId,
          model: modelId,
          ...(initialMessages ? { initialMessages } : {}),
        };

        setPanelsState((prev) => ({
          ...prev,
          [newPanelId]: {
            running: false,
            hasMessages: !!initialMessages?.some((m) => m.role === "user"),
          },
        }));

        setThreadMessages((prev) => ({
          ...prev,
          [newPanelId]: initialMessages ?? [],
        }));

        setPanelsConfig((prev) => {
          const next = [...prev, newPanel];
          saveLastModels(next);
          return next;
        });

        onAddPanel?.(newPanelId);
        setUIState((prev) => ({ ...prev, modelPicker: null }));

        if (initialMessages?.length && currentChatId) {
          void duplicateThreadMutation
            .mutateAsync({
              chatId: currentChatId,
              sourceThreadId: sourcePanelId,
              newThreadId: newPanelId,
              newModelId: modelId,
            })
            .catch((error: unknown) => {
              const message =
                error instanceof Error ? error.message : JSON.stringify(error);
              toast.error(panelActionsT("toasts.duplicateError", { message }));
            });
        }

        return;
      }
    },
    [
      cloneThreadMessages,
      currentChatId,
      duplicateThreadMutation,
      getPanelMessages,
      modelPicker,
      onAddPanel,
      panelActionsT,
      panelsConfig,
      saveLastModels,
      setPanelsConfig,
      setPanelsState,
      setThreadMessages,
      setUIState,
    ]
  );

  const isModelPickerOpen = Boolean(modelPicker);
  const currentModelIdForPicker =
    modelPicker?.type === "thread-change" ||
    modelPicker?.type === "thread-duplicate"
      ? panelsConfig.find((panel) => panel.id === modelPicker.panelId)?.model
      : panelsConfig[0]?.model;

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
        <GlobalComposer
          onAddPanel={onAddPanel}
          footerHidden={sessionHideLegal}
        />
      </div>
      {isMobile ? (
        <Sheet
          open={isModelPickerOpen}
          onOpenChange={(open) => {
            if (!open) handleModelPickerClose();
          }}
        >
          <SheetContent side="bottom" className="h-[100dvh] w-screen gap-0 p-0">
            <ModelDropdownContents
              onSelect={handleModelPickerSelect}
              currentModelId={currentModelIdForPicker}
              onClose={handleModelPickerClose}
              variant="sheet"
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog
          open={isModelPickerOpen}
          onOpenChange={(open) => {
            if (!open) handleModelPickerClose();
          }}
        >
          <DialogContent className="max-w-[min(1200px,95vw)] w-[min(1200px,95vw)] h-[min(85vh,720px)] p-0 overflow-hidden">
            <ModelDropdownContents
              onSelect={handleModelPickerSelect}
              currentModelId={currentModelIdForPicker}
              onClose={handleModelPickerClose}
              variant="modal"
            />
          </DialogContent>
        </Dialog>
      )}
      <AppFooter
        isLoggedIn={!!user}
        hide={sessionHideLegal}
        onHide={() => setSessionHideLegal(true)}
      />
    </div>
  );
};
