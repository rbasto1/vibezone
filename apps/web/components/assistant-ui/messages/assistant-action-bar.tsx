"use client";

import {
  ActionBarPrimitive,
  MessagePrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import { useState, type FC } from "react";

import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { modelMap } from "@/lib/model-map";
import { useCurrentChatValue } from "@/hooks/use-chat";
import { useUser } from "@/lib/auth-client";
import { useOpenSignIn } from "@/lib/auth-client";
import type { MessageMetadata } from "@vibezone/database";
import {
  BrainIcon,
  CheckIcon,
  CopyIcon,
  InfoIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AssistantMessageRateControl } from "./parts/assistant-message-rate-control";
import { CreateMemoryModal } from "./create-memory-modal";

const formatDuration = (durationMs: number) => {
  if (Number.isNaN(durationMs) || durationMs < 0) {
    return null;
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }
  if (durationMs < 1000 * 60) {
    return `${(durationMs / 1000).toFixed(1)} s`;
  }
  const minutes = Math.floor(durationMs / (1000 * 60));
  const restSeconds = Math.floor((durationMs % (1000 * 60)) / 1000)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${restSeconds}`;
};

export const AssistantActionBar: FC = () => {
  const t = useTranslations("Message");
  const message = useAssistantState(({ message }) => message);
  const thread = useAssistantState(({ thread }) => thread);
  const customMetadata = (message.metadata as MessageMetadata)?.custom ?? {};
  const chat = useCurrentChatValue();
  const user = useUser();
  const openSignIn = useOpenSignIn();

  const modelId =
    typeof customMetadata.modelId === "string"
      ? customMetadata.modelId
      : undefined;
  const startTime =
    typeof customMetadata.startTime === "number"
      ? customMetadata.startTime
      : undefined;
  const endTime =
    typeof customMetadata.endTime === "number"
      ? customMetadata.endTime
      : undefined;
  const modelName = modelId
    ? (modelMap.get(modelId)?.name ?? modelId)
    : undefined;
  const duration =
    startTime && endTime && startTime < endTime
      ? endTime - startTime
      : undefined;
  const formattedDuration =
    typeof duration === "number"
      ? (formatDuration(duration) ?? undefined)
      : undefined;
  const messageTs = endTime || startTime || message.createdAt;
  const formattedTimestamp = messageTs
    ? new Date(messageTs).toLocaleString()
    : undefined;

  const chatId = chat?.id ?? null;
  const projectId = chat?.projectId ?? null;
  const threadId =
    (thread as { id?: string } | undefined)?.id ??
    (message as { threadId?: string })?.threadId ??
    null;
  const [isMemoryModalOpen, setMemoryModalOpen] = useState(false);

  const handleOpenMemoryModal = () => {
    if (!user) {
      openSignIn();
      return;
    }
    if (!projectId || !threadId || !message.id || !chatId) {
      toast.error(t("memory.errors.unavailable"));
      return;
    }
    setMemoryModalOpen(true);
  };

  const hasInfo = Boolean(modelName || formattedTimestamp || formattedDuration);

  return (
    <>
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        autohideFloat="single-branch"
        // aui-assistant-action-bar-root
        className="text-muted-foreground data-floating:bg-background col-start-3 row-start-2 mt-3 ml-3 flex gap-2 data-floating:absolute data-floating:mt-2 data-floating:rounded-md data-floating:border data-floating:p-1 data-floating:shadow-sm overflow-hidden whitespace-nowrap max-w-full"
      >
        <AssistantMessageRateControl delayDuration={200} />
        <ActionBarPrimitive.Copy asChild>
          <TooltipIconButton tooltip={t("copy")} delayDuration={200}>
            <MessagePrimitive.If copied>
              <CheckIcon />
            </MessagePrimitive.If>
            <MessagePrimitive.If copied={false}>
              <CopyIcon />
            </MessagePrimitive.If>
          </TooltipIconButton>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload asChild>
          <TooltipIconButton tooltip={t("refresh")} delayDuration={200}>
            <RefreshCwIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.Reload>
        {message.role === "assistant" && (
          <TooltipIconButton
            tooltip={t("memory.tooltip")}
            delayDuration={200}
            onClick={handleOpenMemoryModal}
          >
            <BrainIcon className="size-4" />
          </TooltipIconButton>
        )}
        {hasInfo && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="size-6 rounded-full p-1 text-muted-foreground transition hover:text-foreground"
                aria-label={t("info.tooltipLabel")}
              >
                <InfoIcon className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-left space-y-1">
              {modelName && (
                <div>{t("info.model", { model: modelName })}</div>
              )}
              {formattedDuration && (
                <div>{t("info.duration", { value: formattedDuration })}</div>
              )}
              {formattedTimestamp && (
                <div>{t("info.timestamp", { value: formattedTimestamp })}</div>
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </ActionBarPrimitive.Root>
      {message.id && (
        <CreateMemoryModal
          open={isMemoryModalOpen}
          onOpenChange={setMemoryModalOpen}
          chatId={chatId}
          threadId={threadId}
          messageId={message.id}
          projectId={projectId}
        />
      )}
    </>
  );
};
