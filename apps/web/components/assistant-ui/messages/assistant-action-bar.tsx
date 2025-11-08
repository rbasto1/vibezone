"use client";

import {
  ActionBarPrimitive,
  MessagePrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import type { FC } from "react";

import { TooltipIconButton } from "@/components/assistant-ui/messages/tooltip-icon-button";
import { modelMap } from "@/lib/model-map";
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { AssistantMessageRateControl } from "./parts/assistant-message-rate-control";

interface MetadataCustom {
  modelId?: unknown;
  duration?: unknown;
}

const formatDuration = (durationMs: number) => {
  if (Number.isNaN(durationMs) || durationMs < 0) {
    return null;
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }
  return `${(durationMs / 1000).toFixed(1)} s`;
};

export const AssistantActionBar: FC = () => {
  const message = useAssistantState(({ message }) => message);
  const customMetadata: MetadataCustom =
    (message.metadata as { custom?: MetadataCustom } | undefined)?.custom ?? {};

  const modelId =
    typeof customMetadata.modelId === "string"
      ? customMetadata.modelId
      : undefined;
  const duration =
    typeof customMetadata.duration === "number"
      ? customMetadata.duration
      : undefined;
  const modelName = modelId
    ? (modelMap.get(modelId)?.name ?? modelId)
    : undefined;
  const formattedDuration =
    typeof duration === "number"
      ? (formatDuration(duration) ?? undefined)
      : undefined;

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
      {modelName && (
        <span
          className="text-sm font-medium hidden group-hover:block mt-0.5"
          title={modelName}
        >
          {modelName}
        </span>
      )}
      {formattedDuration && (
        <span className="text-sm text-muted-foreground hidden group-hover:block mt-0.5">
          {formattedDuration}
        </span>
      )}
    </ActionBarPrimitive.Root>
  );
};
