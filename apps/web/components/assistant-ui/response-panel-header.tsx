"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/components/ui/utils";
import { useCurrentChatValue } from "@/hooks/use-chat";
import { useModelFavorites } from "@/hooks/use-model-favorites";
import { useModelsValue } from "@/hooks/use-models";
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
  CircleStopIcon,
  InfoIcon,
  MoreVerticalIcon,
  SparklesIcon,
  StarIcon,
  StarOffIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { BotPlusIcon } from "../ui/icons/bot-plus-icon";
import { ProviderIcon } from "../ui/providers/provider";
import { ConfirmCloseModal } from "./confirm-close-modal";

export interface PanelHeaderProps {
  panel: PanelConfig;
  onStop?: () => void;
}

export const PanelHeader: FC<PanelHeaderProps> = ({ panel, onStop }) => {
  const t = useTranslations("ResponsePanelHeader");
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();
  const threadId = panel.id;
  const modelId = panel.model;
  const [panelsConfig, setPanelsConfig] = usePanelsConfig();
  const panelState = usePanelStateValue(threadId);
  const preferences = useUserPreferencesValue();
  const setThreadMessages = useSetAtom(threadMessagesAtom);
  const currentChat = useCurrentChatValue();
  const chatId = currentChat?.id ?? null;
  const setUIState = useUIStateSetter();
  const utils = trpc.useUtils();
  const deleteThreadMutation = trpc.chats.deleteThread.useMutation();
  const moveThreadMutation = trpc.chats.moveThreadToNewChat.useMutation();
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

  const isActive = panelState.running;
  const stopLabel = t("stopLabel");
  const canDiscard = panelsConfig.length > 1;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            disabled={isProcessing}
            title={t("menuLabel")}
            className={cn(
              "flex justify-between mt-2 px-3 py-2 gap-2 fixed z-50 min-w-0 h-8 items-center truncate border-border bg-muted text-sm font-medium text-foreground transition-colors hover:bg-muted-foreground/10",
              isActive && "panel-button-glow"
            )}
          >
            <span className="flex items-center gap-2 truncate min-w-0">
              {provider && <ProviderIcon providerId={provider.id} />}
              <span className="truncate">{model.name ?? modelId}</span>
            </span>
            <span className="flex items-center gap-1">
              {favorite && (
                <StarIcon
                  className="h-4 w-4 text-yellow-500"
                  fill="currentColor"
                />
              )}
              {isActive && onStop ? (
                <span
                  role="button"
                  tabIndex={-1}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-destructive/10"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onStop();
                  }}
                  aria-label={stopLabel}
                  title={stopLabel}
                >
                  <CircleStopIcon className="h-4 w-4 text-destructive" />
                </span>
              ) : (
                <MoreVerticalIcon className="h-4 w-4" />
              )}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-70">
          <DropdownMenuItem onSelect={openModelInfo}>
            <InfoIcon className="mr-2 h-4 w-4" />
            {t("menuModelInfo")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openModelPicker}>
            <SparklesIcon className="mr-2 h-4 w-4" />
            {t("menuChangeModel")}
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
          <DropdownMenuItem
            disabled={!canDiscard}
            title={!canDiscard ? t("closeDisabledTooltip") : undefined}
            onSelect={handleMove}
          >
            <ArrowUpRightIcon className="mr-2 h-4 w-4" />
            {t("menuMoveThread")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openDuplicatePicker}>
            <BotPlusIcon className="mr-2 h-4 w-4" />
            {t("menuDuplicateThread")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={!canDiscard}
            title={!canDiscard ? t("closeDisabledTooltip") : undefined}
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
