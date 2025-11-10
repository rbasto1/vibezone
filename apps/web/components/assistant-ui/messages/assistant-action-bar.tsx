"use client";

import {
  ActionBarPrimitive,
  MessagePrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import type { FC } from "react";

import { TooltipIconButton } from "@/components/assistant-ui/messages/tooltip-icon-button";
import { modelMap } from "@/lib/model-map";
import type { MessageMetadata } from "@vibezone/database";
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { AssistantMessageRateControl } from "./parts/assistant-message-rate-control";

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
  const message = useAssistantState(({ message }) => message);
  const customMetadata = (message.metadata as MessageMetadata)?.custom ?? {};

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

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      // aui-assistant-action-bar-root
      className="text-muted-foreground data-floating:bg-background col-start-3 row-start-2 mt-3 ml-3 flex gap-2 data-floating:absolute data-floating:mt-2 data-floating:rounded-md data-floating:border data-floating:p-1 data-floating:shadow-sm overflow-hidden whitespace-nowrap max-w-full"
    >
      <AssistantMessageRateControl delayDuration={200} />
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy" delayDuration={200}>
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh" delayDuration={200}>
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      {formattedDuration && (
        <span className="text-sm text-muted-foreground hidden group-hover:block mt-0.5">
          {formattedDuration}
        </span>
      )}
      {modelName && (
        <span
          className="text-sm font-medium hidden group-hover:block mt-0.5"
          title={modelName}
        >
          {modelName}
        </span>
      )}
      {!!messageTs && (
        <span className="text-sm text-muted-foreground hidden group-hover:block mt-0.5">
          {new Date(messageTs).toLocaleString()}
        </span>
      )}
    </ActionBarPrimitive.Root>
  );
};
