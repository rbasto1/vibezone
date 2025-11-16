"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { StopIcon } from "@/components/ui/icons/stop";
import { useCurrentChatValue } from "@/hooks/use-chat";
import { useModelFavorites } from "@/hooks/use-model-favorites";
import { useModelsValue } from "@/hooks/use-models";
import { useNewChatHandler } from "@/hooks/use-new-chat-handler";
import {
  usePanelsConfig,
  usePanelsStateSetter,
  usePanelStateValue,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import { useOpenSignIn } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import { threadMessagesAtom } from "@/store/thread-messages";
import { useSetAtom } from "jotai";
import {
  ArrowUpRightIcon,
  InfoIcon,
  MessageCirclePlusIcon,
  MoreVerticalIcon,
  SparklesIcon,
  StarIcon,
  StarOffIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { BotPlusIcon } from "../../ui/icons/bot-plus-icon";
import { ShortcutHint } from "../../ui/shortcut-hint";
import { ConfirmCloseModal } from "../confirm-close-modal";
import { ThreadHeaderProviderLabel } from "./thread-header-provider-label";

export interface PanelHeaderProps {
  panel: PanelConfig;
  onStop?: () => void;
}

export const PanelHeader: FC<PanelHeaderProps> = ({ panel, onStop }) => {
  const t = useTranslations("ResponsePanelHeader");
  const threadListT = useTranslations("ThreadList");
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();
  const threadId = panel.id;
  const modelId = panel.model;
  const [panelsConfig, setPanelsConfig] = usePanelsConfig();
  const panelState = usePanelStateValue(threadId);
  const preferences = useUserPreferencesValue();
  const setThreadMessages = useSetAtom(threadMessagesAtom);
  const currentChat = useCurrentChatValue();
  const setUIState = useUIStateSetter();
  const utils = trpc.useUtils();
  const deleteThreadMutation = trpc.chats.deleteThread.useMutation();
  const moveThreadMutation = trpc.chats.moveThreadToNewChat.useMutation();
  const createChat = useNewChatHandler();
  const canClose = panelsConfig.length > 1;
  const includeModels = [modelId];
  const { models, providers } = useModelsValue({ includeModels });
  const { isFavorite, toggleFavorite, user, isToggling } = useModelFavorites();
  const openSignIn = useOpenSignIn();
  const model = models.find((item) => item.id === modelId) ?? {
    id: modelId,
    name: modelId,
    providerId: modelId.split("/")[0] ?? "",
  };
  const provider = providers.find((item) => item.id === model.providerId);
  const chatId = currentChat?.id ?? null;
  const isNewChat = !currentChat.addedToList;

  const favorite = Boolean(user) && isFavorite(modelId);

  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const finalizePanelRemoval = useCallback(() => {
    setPanelsConfig((prev) => {
      const next = prev.filter((p) => p.id !== threadId);
      saveLastModels(next);
      return next;
    });
    setPanelsState((currentState) => {
      const newState = { ...currentState };
      delete newState[threadId];
      return newState;
    });
    setThreadMessages((prev) => {
      if (!(threadId in prev)) {
        return prev;
      }
      const rest = { ...prev };
      delete rest[threadId];
      return rest;
    });
    setShowConfirmClose(false);
  }, [
    threadId,
    saveLastModels,
    setPanelsConfig,
    setPanelsState,
    setThreadMessages,
  ]);

  const executeDiscard = async () => {
    if (isProcessing) return;

    if (!canClose) {
      toast.error(t("closeDisabledTooltip"));
      return;
    }

    finalizePanelRemoval();

    if (panelState.hasMessages && chatId) {
      setIsProcessing(true);
      await deleteThreadMutation
        .mutateAsync({ chatId, threadId })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : JSON.stringify(error);
          toast.error(t("toasts.discardError", { message }));
          setShowConfirmClose(true);
        });
      setIsProcessing(false);
    }
  };

  const handleMove = useCallback(async () => {
    if (isProcessing) return;

    if (!canClose) {
      toast.error(t("closeDisabledTooltip"));
      return;
    }

    if (!panelState.hasMessages || !chatId) {
      finalizePanelRemoval();
      return;
    }

    setIsProcessing(true);
    try {
      const result = await moveThreadMutation.mutateAsync({
        chatId,
        threadId,
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
    chatId,
    finalizePanelRemoval,
    isProcessing,
    moveThreadMutation,
    threadId,
    panelState.hasMessages,
    t,
    utils,
  ]);

  const handleDiscardRequest = () => {
    if (isProcessing) return;
    if (!canClose) {
      toast.error(t("closeDisabledTooltip"));
      return;
    }
    if (panelState.hasMessages && !preferences.skipCloseThreadConfirmation) {
      setShowConfirmClose(true);
      return;
    }

    void executeDiscard();
  };

  const openModelPicker = () => {
    setUIState((prev) => ({
      ...prev,
      modelPicker: { type: "thread-change", panelId: threadId },
    }));
  };

  const handleStartNewChat = useCallback(() => {
    const chat = createChat();
    if (!chat) {
      toast.error(threadListT("errors.createChat"));
    }
  }, [createChat, threadListT]);

  const openDuplicatePicker = () => {
    if (isProcessing) return;
    setUIState((prev) => ({
      ...prev,
      modelPicker: { type: "thread-duplicate", panelId: threadId },
    }));
  };

  const openModelInfo = useCallback(() => {
    setUIState({ detailsModelId: modelId });
  }, [modelId, setUIState]);

  const stopLabel = t("stopLabel");

  if (onStop) {
    return (
      <div className="flex justify-between mt-2 px-3 py-2 gap-2 fixed z-50 min-w-0 h-8 items-center truncate border-border bg-muted text-sm font-medium text-foreground transition-colors hover:bg-muted-foreground/10 panel-button-glow">
        <ThreadHeaderProviderLabel
          providerId={provider?.id}
          modelName={model.name ?? modelId}
        />
        <div className="flex items-center gap-1">
          {favorite && (
            <StarIcon className="h-4 w-4 text-yellow-500" fill="currentColor" />
          )}
          <button
            tabIndex={-1}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-destructive/10 cursor-pointer"
            onClick={onStop}
            aria-label={stopLabel}
            title={stopLabel}
          >
            <StopIcon className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isProcessing}
            title={t("menuLabel")}
            className="flex justify-between mt-2 px-3 py-2 gap-2 fixed z-50 min-w-0 h-8 items-center truncate border-border bg-muted text-sm font-medium text-foreground transition-colors hover:bg-muted-foreground/10"
          >
            <ThreadHeaderProviderLabel
              providerId={provider?.id}
              modelName={model.name ?? modelId}
            />
            <div className="flex items-center gap-1">
              {favorite && (
                <StarIcon
                  className="h-4 w-4 text-yellow-500"
                  fill="currentColor"
                />
              )}
              <MoreVerticalIcon className="h-4 w-4 ml-2" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-70">
          <DropdownMenuItem onSelect={openModelPicker}>
            <SparklesIcon className="mr-2 h-4 w-4" />
            {isNewChat
              ? t("menuChangeModel")
              : t("menuChangeModelGoingForward")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              if (isToggling) {
                event.preventDefault();
                return;
              }
              if (!user) {
                event.preventDefault();
                openSignIn();
                return;
              }
              toggleFavorite(modelId);
            }}
            disabled={isToggling}
          >
            {favorite ? (
              <StarOffIcon className="mr-2 h-4 w-4" />
            ) : (
              <StarIcon className="mr-2 h-4 w-4" />
            )}
            {favorite ? t("menuUnfavorite") : t("menuFavorite")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openModelInfo}>
            <InfoIcon className="mr-2 h-4 w-4" />
            {t("menuModelInfo")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleStartNewChat}>
            <MessageCirclePlusIcon className="mr-2 h-4 w-4" />
            {t("menuStartNewChat")}
            <DropdownMenuShortcut>
              <ShortcutHint combo={["cmdOrCtrl", "shift", "O"]} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openDuplicatePicker}>
            <BotPlusIcon className="mr-2 h-4 w-4" />
            {t("menuDuplicateThread")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canClose}
            title={!canClose ? t("closeDisabledTooltip") : undefined}
            onSelect={handleMove}
          >
            <ArrowUpRightIcon className="mr-2 h-4 w-4" />
            {t("menuMoveThread")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={!canClose}
            title={!canClose ? t("closeDisabledTooltip") : undefined}
            onSelect={handleDiscardRequest}
          >
            <Trash2Icon className="mr-2 h-4 w-4" />
            {t("menuDiscardThread")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {showConfirmClose && (
        <ConfirmCloseModal
          onOpenChange={setShowConfirmClose}
          onDiscard={executeDiscard}
          onMove={handleMove}
          isProcessing={isProcessing}
        />
      )}
    </>
  );
};
