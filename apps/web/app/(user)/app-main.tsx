import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { CopyConversationModal } from "@/components/assistant-ui/copy-conversation-modal";
import { ModelDropdownContents } from "@/components/assistant-ui/model-selector/model-dropdown-contents";
import { SearchPanel } from "@/components/assistant-ui/search-panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarInset } from "@/components/ui/sidebar/sidebar-inset";
import { useAddAi } from "@/hooks/use-add-ai";
import { useCurrentChatValue } from "@/hooks/use-chat";
import { useFocusPanelIdValue } from "@/hooks/use-focus-panel";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePanelsConfig, usePanelsStateSetter } from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { useUIState, useUIStateValue } from "@/hooks/use-ui-state";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId, getNextThreadOrderFromExisting } from "@/lib/id";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import { threadMessagesAtom } from "@/store/thread-messages";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { startTransition, type FC } from "react";
import { AppChat } from "./app-chat";
import PreferencesPage from "./preferences/tabs";

export const AppMain: FC = () => {
  const { panelOpen } = useUIStateValue();
  const [uiState, setUIState] = useUIState();
  const [panelsConfig, setPanelsConfig] = usePanelsConfig();
  const setPanelsState = usePanelsStateSetter();
  const focusPanelId = useFocusPanelIdValue();
  const isMobile = useIsMobile();
  useGlobalShortcuts();

  const saveLastModels = useSaveLastModels();
  const [threadMessages, setThreadMessages] = useAtom(threadMessagesAtom);
  const duplicateThreadMutation = trpc.messages.duplicateThread.useMutation();
  const currentChat = useCurrentChatValue();
  const currentChatId = currentChat.addedToList
    ? (currentChat?.id ?? null)
    : null;
  const modelPicker = uiState.modelPicker;
  const panelActionsT = useTranslations("ResponsePanelHeader");
  const removeFocus = focusPanelId
    ? () => setUIState({ focusPanelId: undefined })
    : undefined;
  const {
    handleAddModelSelection,
    pendingPanel,
    copyOptions,
    handleCopySelect,
    handleCopyCancel,
  } = useAddAi({ onAddPanel: removeFocus });

  const handleModelPickerClose = () =>
    setUIState((prev) => ({ ...prev, modelPicker: null }));

  const getPanelMessages = (panelId: string): ThreadMessageLike[] => {
    const stored = threadMessages[panelId];
    if (stored?.length) {
      return stored;
    }
    const panel = panelsConfig.find((p) => p.id === panelId);
    return panel?.initialMessages ?? [];
  };

  const handleModelPickerSelect = (providerId: string, modelId: string) => {
    const picker = modelPicker;
    if (!picker) return;

    startTransition(() => {
      setUIState((prev) => ({
        ...prev,
        modelPicker: null,
        suggestionsUsed: true,
      }));
      removeFocus?.();

      switch (picker.type) {
        case "add-panel":
          handleAddModelSelection(providerId, modelId);
          break;

        case "suggestion":
          setPanelsConfig((prevPanels) => {
            const panel = prevPanels[0];
            if (!panel) return prevPanels;
            const nextPanels = [
              {
                ...panel,
                provider: providerId,
                model: modelId,
              },
            ];
            saveLastModels(nextPanels);
            return nextPanels;
          });
          break;

        case "thread-change":
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
          break;

        case "thread-duplicate": {
          if (panelsConfig.length >= MAX_PANELS) {
            toast.error(
              panelActionsT("toasts.duplicateLimit", { max: MAX_PANELS })
            );
            return;
          }

          const sourcePanelId = picker.panelId;
          const sourcePanel = panelsConfig.find(
            (panel) => panel.id === sourcePanelId
          );
          if (!sourcePanel) {
            toast.error(panelActionsT("toasts.duplicateMissing"));
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
                  error instanceof Error
                    ? error.message
                    : JSON.stringify(error);
                toast.error(
                  panelActionsT("toasts.duplicateError", { message })
                );
              });
          }
          break;
        }
      }
    });
  };

  const isModelPickerOpen = Boolean(modelPicker);
  const currentModelIdForPicker =
    modelPicker?.type === "thread-change" ||
    modelPicker?.type === "thread-duplicate"
      ? panelsConfig.find((panel) => panel.id === modelPicker.panelId)?.model
      : panelsConfig[0]?.model;

  return (
    <SidebarInset>
      {panelOpen === "preferences" && <PreferencesPage />}
      {panelOpen === "search" && <SearchPanel />}
      <AppChat hide={!!panelOpen} focusPanelId={focusPanelId} />

      {isModelPickerOpen &&
        (isMobile ? (
          <Sheet
            open
            onOpenChange={(open) => {
              if (!open) handleModelPickerClose();
            }}
          >
            <SheetContent
              side="bottom"
              className="h-dvh w-screen gap-0 p-0"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
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
            open
            onOpenChange={(open) => {
              if (!open) handleModelPickerClose();
            }}
          >
            <DialogContent
              className="max-w-[min(1200px,95vw)] w-[min(1200px,95vw)] h-[min(85vh,720px)] p-0 overflow-hidden"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <VisuallyHidden>
                <DialogHeader>
                  <DialogTitle aria-label="Choose Model">
                    Choose Model
                  </DialogTitle>
                </DialogHeader>
              </VisuallyHidden>
              <ModelDropdownContents
                onSelect={handleModelPickerSelect}
                currentModelId={currentModelIdForPicker}
                onClose={handleModelPickerClose}
                variant="modal"
              />
            </DialogContent>
          </Dialog>
        ))}
      {pendingPanel && (
        <CopyConversationModal
          options={copyOptions}
          onSelect={handleCopySelect}
          onCancel={handleCopyCancel}
        />
      )}
    </SidebarInset>
  );
};

function cloneThreadMessages(messages?: ThreadMessageLike[]) {
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
}
