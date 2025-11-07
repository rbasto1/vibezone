"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/components/ui/utils";
import { useCurrentChatValue } from "@/hooks/use-chat";
import {
  usePanelsConfig,
  usePanelsStateSetter,
  usePanelStateValue,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import { threadMessagesAtom } from "@/store/thread-messages";
import { useSetAtom } from "jotai";
import { ConfirmCloseModal } from "./confirm-close-modal";
import { ModelDropdown } from "./model-dropdown";

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
  const preferences = useUserPreferencesValue();
  const setThreadMessages = useSetAtom(threadMessagesAtom);
  const currentChat = useCurrentChatValue();
  const currentChatId = currentChat?.id ?? null;
  const setUIState = useUIStateSetter();
  const utils = trpc.useUtils();
  const deleteThreadMutation = trpc.chats.deleteThread.useMutation();
  const moveThreadMutation = trpc.chats.moveThreadToNewChat.useMutation();
  const canClose = panelsConfig.length > 1;

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

  const executeDiscard = useCallback(async () => {
    if (isProcessing) return;

    if (!canClose) {
      toast.error(t("closeDisabledTooltip"));
      return;
    }

    if (
      !panelState.hasMessages ||
      !currentChatId ||
      preferences.skipCloseThreadConfirmation
    ) {
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
    canClose,
    currentChatId,
    deleteThreadMutation,
    finalizePanelRemoval,
    isProcessing,
    panelId,
    panelState.hasMessages,
    preferences.skipCloseThreadConfirmation,
    t,
  ]);

  const handleMove = useCallback(async () => {
    if (isProcessing) return;

    if (!canClose) {
      toast.error(t("closeDisabledTooltip"));
      return;
    }

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
    canClose,
    currentChatId,
    finalizePanelRemoval,
    isProcessing,
    moveThreadMutation,
    panelId,
    panelState.hasMessages,
    t,
    utils,
  ]);

  const handleDiscardRequest = useCallback(() => {
    if (isProcessing) return;
    if (!canClose) {
      toast.error(t("closeDisabledTooltip"));
      return;
    }
    if (panelState.hasMessages) {
      setShowConfirmClose(true);
      return;
    }

    if (!panelState.hasMessages) {
      finalizePanelRemoval();
    }
  }, [canClose, finalizePanelRemoval, isProcessing, panelState.hasMessages, t]);

  const openModelPicker = useCallback(() => {
    setUIState((prev) => ({
      ...prev,
      modelPicker: { type: "thread-change", panelId },
    }));
  }, [panelId, setUIState]);

  const openDuplicatePicker = useCallback(() => {
    if (isProcessing) return;
    setUIState((prev) => ({
      ...prev,
      modelPicker: { type: "thread-duplicate", panelId },
    }));
  }, [isProcessing, panelId, setUIState]);

  const isActive = panelState.running;
  const stopLabel = t("stopLabel");

  return (
    <>
      <ModelDropdown
        modelId={modelId}
        isRunning={panelState.running}
        isProcessing={isProcessing}
        canDiscard={canClose}
        onStop={onStop}
        onOpenModelPicker={openModelPicker}
        onMoveThread={() => {
          void handleMove();
        }}
        onDuplicateThread={openDuplicatePicker}
        onDiscardThread={handleDiscardRequest}
        stopLabel={stopLabel}
        className={cn(
          "flex items-center justify-between mt-2 px-3 py-2 gap-2 fixed z-50 min-w-0",
          isActive && "panel-button-glow"
        )}
      />
      {showConfirmClose && (
        <ConfirmCloseModal
          onOpenChange={setShowConfirmClose}
          onDiscard={() => {
            void executeDiscard();
          }}
          onMove={() => {
            void handleMove();
          }}
          isProcessing={isProcessing}
        />
      )}
    </>
  );
};
