import type { ThreadMessageLike } from "@assistant-ui/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/components/ui/utils";
import { useCurrentChatValue } from "@/hooks/use-chat";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  usePanelsConfigSetter,
  usePanelsConfigValue,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import {
  comparableMessagesEqual,
  toComparableMessages,
} from "@/lib/assistant-ui/message-compare";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import { trpc } from "@/lib/trpc/client";
import { threadMessagesAtom } from "@/store/thread-messages";
import { BotPlusIcon } from "../ui/icons/bot-plus-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { CopyConversationModal } from "./copy-conversation-modal";
import { ModelDropdownContents } from "./model-dropdown-contents";

interface AddAiButtonProps {
  panelCount: number;
  onAddPanel?: (id: string) => void;
}

export const AddAiButton: FC<AddAiButtonProps> = ({
  panelCount,
  onAddPanel,
}) => {
  const t = useTranslations("AssistantHeader");
  const panelsConfig = usePanelsConfigValue();
  const setPanelsConfig = usePanelsConfigSetter();
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();
  const threadMessages = useAtomValue(threadMessagesAtom);
  const setThreadMessages = useSetAtom(threadMessagesAtom);
  const [chooseModelOpen, setChooseModelOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [pendingPanel, setPendingPanel] = useState<{
    id: string;
    providerId: string;
    modelId: string;
  } | null>(null);
  const currentChatId = useCurrentChatValue()?.id;
  const { mutate: duplicateThread } = trpc.messages.duplicateThread.useMutation(
    {
      onError: (error) => {
        toast.error(`Could not save new thread: ${error.message}`);
      },
    }
  );

  const canAddMore = panelCount < MAX_PANELS;
  const isMobile = useIsMobile();
  const addButtonTitle = canAddMore
    ? t("addAnotherTooltip")
    : t("maxModelsTooltip", { max: MAX_PANELS });
  const addButtonLabel = t("addAiButton");
  const addButtonAriaLabel = t("addAiAriaLabel");

  const cloneThreadMessages = useCallback((messages?: ThreadMessageLike[]) => {
    if (!messages?.length) return undefined;
    return messages.map((message) => ({ ...message }));
  }, []);

  const getPanelMessages = useCallback(
    (panelId: string): ThreadMessageLike[] => {
      const storedMessages = threadMessages[panelId];
      if (storedMessages?.length) {
        return storedMessages;
      }
      const panel = panelsConfig.find((item) => item.id === panelId);
      return panel?.initialMessages ?? [];
    },
    [panelsConfig, threadMessages]
  );

  const getSharedMessages = useCallback(() => {
    const [firstPanel, ...rest] = panelsConfig;
    if (!firstPanel || !rest.length) {
      return undefined;
    }
    const baseMessages = getPanelMessages(firstPanel.id);
    const comparableBase = toComparableMessages(baseMessages);
    const allMatch = rest.every((panel) => {
      const nextMessages = getPanelMessages(panel.id);
      const comparableNext = toComparableMessages(nextMessages);
      return comparableMessagesEqual(comparableBase, comparableNext);
    });
    return allMatch ? baseMessages : undefined;
  }, [getPanelMessages, panelsConfig]);

  const finalizeAddPanel = useCallback(
    ({
      id,
      providerId,
      modelId,
      sourceThreadId,
      sourceMessages,
    }: {
      id: string;
      providerId: string;
      modelId: string;
      sourceThreadId?: string;
      sourceMessages?: ThreadMessageLike[];
    }) => {
      const initialMessages = cloneThreadMessages(sourceMessages);
      const hasMessages = !!initialMessages?.some((m) => m.role === "user");

      setPanelsState((prev) => ({
        ...prev,
        [id]: {
          running: false,
          hasMessages,
        },
      }));

      setThreadMessages((prev) => ({
        ...prev,
        [id]: initialMessages ?? [],
      }));

      setPanelsConfig((prev) => {
        const newPanels = [
          ...prev,
          {
            id,
            provider: providerId,
            model: modelId,
            ...(initialMessages ? { initialMessages } : {}),
          },
        ];

        saveLastModels(newPanels);

        return newPanels;
      });
      onAddPanel?.(id);
      if (sourceThreadId && hasMessages && currentChatId) {
        duplicateThread({
          chatId: currentChatId,
          sourceThreadId,
          newThreadId: id,
          newModelId: modelId,
        });
      }
      setPendingPanel(null);
      setCopyModalOpen(false);
    },
    [
      cloneThreadMessages,
      currentChatId,
      duplicateThread,
      onAddPanel,
      saveLastModels,
      setPanelsConfig,
      setPanelsState,
      setThreadMessages,
    ]
  );

  const handleAddPanel = (providerId: string, modelId: string) => {
    if (!canAddMore) return;
    const id = generateThreadId(panelCount);
    const newPanel = {
      id,
      providerId,
      modelId,
    };

    if (!panelsConfig.length) {
      finalizeAddPanel({ ...newPanel });
      setChooseModelOpen(false);
      return;
    }

    const sharedMessages = getSharedMessages();
    const [sourcePanel, secondPanel] = panelsConfig;
    if (sharedMessages && sourcePanel) {
      finalizeAddPanel({
        ...newPanel,
        sourceMessages: sharedMessages,
        sourceThreadId: sourcePanel.id,
      });
      setChooseModelOpen(false);
      return;
    }

    if (sourcePanel && !secondPanel) {
      const sourceMessages = getPanelMessages(sourcePanel.id);
      finalizeAddPanel({
        ...newPanel,
        sourceMessages,
        sourceThreadId: sourcePanel.id,
      });
      setChooseModelOpen(false);
      return;
    }

    setPendingPanel(newPanel);
    setCopyModalOpen(true);
    setChooseModelOpen(false);
  };

  const triggerClassName = cn(
    "h-8 w-8 rounded-full border border-transparent hover:border-border hover:bg-accent/40",
    canAddMore ? "" : "opacity-60 cursor-not-allowed"
  );

  const handleTriggerClick = () => {
    if (!canAddMore) return;
    setChooseModelOpen(true);
  };

  const handleCopySelect = (sourceId: string) => {
    if (!pendingPanel) return;
    const sourceMessages = getPanelMessages(sourceId);
    finalizeAddPanel({
      ...pendingPanel,
      sourceMessages,
      sourceThreadId: sourceId,
    });
  };

  const handleCopyCancel = () => {
    setPendingPanel(null);
    setCopyModalOpen(false);
  };

  const copyOptions = panelsConfig.map((panel) => ({
    id: panel.id,
    modelId: panel.model,
  }));

  return (
    <>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={triggerClassName}
            disabled={!canAddMore}
            aria-label={addButtonAriaLabel}
            type="button"
            onClick={handleTriggerClick}
          >
            <BotPlusIcon />
            <span className="sr-only">{addButtonLabel}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{addButtonTitle}</TooltipContent>
      </Tooltip>

      {isMobile ? (
        <Sheet open={chooseModelOpen} onOpenChange={setChooseModelOpen}>
          <SheetContent side="bottom" className="h-[100dvh] w-screen gap-0 p-0">
            <ModelDropdownContents
              onSelect={handleAddPanel}
              onClose={() => setChooseModelOpen(false)}
              variant="sheet"
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={chooseModelOpen} onOpenChange={setChooseModelOpen}>
          <DialogContent className="max-w-[min(1200px,95vw)] w-[min(1200px,95vw)] h-[min(85vh,720px)] p-0 overflow-hidden">
            <ModelDropdownContents
              onSelect={handleAddPanel}
              onClose={() => setChooseModelOpen(false)}
              variant="modal"
            />
          </DialogContent>
        </Dialog>
      )}

      {copyModalOpen && !!pendingPanel && (
        <CopyConversationModal
          options={copyOptions}
          onSelect={handleCopySelect}
          onCancel={handleCopyCancel}
        />
      )}
    </>
  );
};
