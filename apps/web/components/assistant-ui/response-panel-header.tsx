"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { StopButton } from "@/components/ui/stop-button";
import { cn } from "@/components/ui/utils";
import { useCurrentChatValue } from "@/hooks/use-chat";
import {
  usePanelsConfig,
  usePanelsStateSetter,
  usePanelStateValue,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import { threadMessagesAtom } from "@/store/thread-messages";
import { useSetAtom } from "jotai";
import { CloseIconButton } from "../ui/close-icon-button";
import { ConfirmCloseModal } from "./confirm-close-modal";
import { ModelDropdown } from "./model-dropdown";
import { ModelFavoriteButton } from "./model-favorite-button";

export interface PanelHeaderProps {
  panel: PanelConfig;
  onStop?: () => void;
}

export const PanelHeader: FC<PanelHeaderProps> = ({ panel, onStop }) => {
  const t = useTranslations("ResponsePanelHeader");
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();
  const panelId = panel.id;
  const modelId = panel.model;
  const [panelsConfig, setPanelsConfig] = usePanelsConfig();
  const panelState = usePanelStateValue(panelId);
  const setThreadMessages = useSetAtom(threadMessagesAtom);
  const currentChat = useCurrentChatValue();
  const currentChatId = currentChat?.id ?? null;
  const utils = trpc.useUtils();
  const deleteThreadMutation = trpc.chats.deleteThread.useMutation();
  const moveThreadMutation = trpc.chats.moveThreadToNewChat.useMutation();

  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const finalizePanelRemoval = useCallback(() => {
    setPanelsConfig((prev) => {
      const next = prev.filter((p) => p.id !== panelId);
      saveLastModels(next);
      return next;
    });
    setPanelsState((currentState) => {
      const newState = { ...currentState };
      delete newState[panelId];
      return newState;
    });
    setThreadMessages((prev) => {
      if (!(panelId in prev)) {
        return prev;
      }
      const rest = { ...prev };
      delete rest[panelId];
      return rest;
    });
    setShowConfirmClose(false);
  }, [
    panelId,
    saveLastModels,
    setPanelsConfig,
    setPanelsState,
    setThreadMessages,
  ]);

  const handleDiscard = useCallback(async () => {
    if (isProcessing) return;

    if (!panelState.hasMessages || !currentChatId) {
      finalizePanelRemoval();
      return;
    }

    setIsProcessing(true);
    try {
      await deleteThreadMutation.mutateAsync({
        chatId: currentChatId,
        threadId: panelId,
      });
      finalizePanelRemoval();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(t("toasts.discardError", { message }));
      setShowConfirmClose(true);
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentChatId,
    deleteThreadMutation,
    finalizePanelRemoval,
    isProcessing,
    panelId,
    panelState.hasMessages,
    t,
  ]);

  const handleMove = useCallback(async () => {
    if (isProcessing) return;

    if (!panelState.hasMessages || !currentChatId) {
      finalizePanelRemoval();
      return;
    }

    setIsProcessing(true);
    try {
      const result = await moveThreadMutation.mutateAsync({
        chatId: currentChatId,
        threadId: panelId,
      });
      await Promise.all([
        utils.chats.listChats.invalidate({ projectId: result.chat.projectId }),
        utils.chats.listChats.invalidate({ projectId: undefined }),
      ]);
      finalizePanelRemoval();
      toast.success(t("toasts.moveSuccess"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(t("toasts.moveError", { message }));
      setShowConfirmClose(true);
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentChatId,
    finalizePanelRemoval,
    isProcessing,
    moveThreadMutation,
    panelId,
    panelState.hasMessages,
    t,
    utils,
  ]);

  const handleRemoveClick = useCallback(() => {
    if (isProcessing) return;
    if (panelState.hasMessages) {
      setShowConfirmClose(true);
      return;
    }

    if (!panelState.hasMessages) {
      finalizePanelRemoval();
      return;
    }

    void handleDiscard();
  }, [
    finalizePanelRemoval,
    handleDiscard,
    isProcessing,
    panelState.hasMessages,
  ]);

  const isActive = panelState.running;
  const canClose = panelsConfig.length > 1;
  const stopLabel = t("stopLabel");
  const closeAria = t("closeAria");
  const closeTooltip = canClose ? t("closeTooltip") : t("closeDisabledTooltip");

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 gap-2 fixed z-50",
        isActive && "panel-button-glow"
      )}
    >
      <div className="flex items-center gap-2">
        <ModelDropdown
          panelId={panelId}
          modelId={modelId}
          className="flex items-center gap-2 min-w-0 flex-1 h-8 text-sm"
        />
        <div className="flex items-center gap-1">
          {onStop && (
            <StopButton
              onClick={onStop}
              aria-label={stopLabel}
              title={stopLabel}
              className="opacity-0 group-hover:opacity-100"
            />
          )}
          <ModelFavoriteButton
            modelId={modelId}
            size="md"
            className="opacity-0 group-hover:opacity-100"
          />
          {canClose && (
            <CloseIconButton
              onClick={handleRemoveClick}
              aria-label={closeAria}
              title={closeTooltip}
              disabled={isProcessing}
              buttonClassName="opacity-0 group-hover:opacity-100"
            />
          )}
        </div>
      </div>
      {showConfirmClose && (
        <ConfirmCloseModal
          onOpenChange={setShowConfirmClose}
          onDiscard={handleDiscard}
          onMove={handleMove}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};
