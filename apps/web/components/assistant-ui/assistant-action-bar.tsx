"use client";

import { ActionBarPrimitive, MessagePrimitive } from "@assistant-ui/react";
import type { FC } from "react";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { AssistantMessageRateControl } from "./assistant-message-rate-control";

export const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      // aui-assistant-action-bar-root
      className="text-muted-foreground data-floating:bg-background col-start-3 row-start-2 mt-3 ml-3 flex gap-1 data-floating:absolute data-floating:mt-2 data-floating:rounded-md data-floating:border data-floating:p-1 data-floating:shadow-sm"
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
};
