"use client";

import {
  ActionBarPrimitive,
  MessagePrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import type { FC } from "react";

import { TooltipIconButton } from "@/components/assistant-ui/messages/tooltip-icon-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  return `${(durationMs / 1000).toFixed(2)} s`;
};

export const AssistantActionBar: FC = () => {
  const message = useAssistantState(({ message }) => message);
  const customMetadata: MetadataCustom =
    (message.metadata as { custom?: MetadataCustom } | undefined)?.custom ??
    {};

  const modelId =
    typeof customMetadata.modelId === "string"
      ? customMetadata.modelId
      : undefined;
  const duration =
    typeof customMetadata.duration === "number"
      ? customMetadata.duration
      : undefined;
  const modelName = modelId
    ? modelMap.get(modelId)?.name ?? modelId
    : undefined;
  const formattedDuration =
    typeof duration === "number" ? formatDuration(duration) ?? undefined : undefined;

  const hasTooltip = Boolean(modelName || formattedDuration);

  const actionBar = (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      // aui-assistant-action-bar-root
      className="text-muted-foreground data-floating:bg-background col-start-3 row-start-2 mt-3 ml-3 flex gap-2 data-floating:absolute data-floating:mt-2 data-floating:rounded-md data-floating:border data-floating:p-1 data-floating:shadow-sm"
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
    </ActionBarPrimitive.Root>
  );

  if (!hasTooltip) {
    return actionBar;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{actionBar}</TooltipTrigger>
        <TooltipContent side="top" align="end" className="flex flex-col gap-1">
          {modelName && (
            <span className="text-sm font-medium">Model: {modelName}</span>
          )}
          {formattedDuration && (
            <span className="text-xs text-muted-foreground">
              Duration: {formattedDuration}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
