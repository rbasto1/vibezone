import {
  ActionBarPrimitive,
  MessagePrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC } from "react";

import { BotPlusIcon } from "@/components/ui/icons/bot-plus-icon";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { usePanelsConfigValue } from "@/hooks/use-panels";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { MAX_PANELS } from "@/lib/constants";

interface UserActionBarProps {
  threadId: string;
}

export const UserActionBar: FC<UserActionBarProps> = ({ threadId }) => {
  const t = useTranslations("Message");
  const panels = usePanelsConfigValue();
  const setUIState = useUIStateSetter();
  const message = useAssistantState(({ message }) => message);

  const reachedMaxPanels = panels.length >= MAX_PANELS;
  const canTriggerAskAnother = !reachedMaxPanels;

  const handleAskAnother = () => {
    if (!canTriggerAskAnother || !message.id) return;
    setUIState((prev) => ({
      ...prev,
      modelPicker: {
        type: "ask-another",
        panelId: threadId,
        messageId: message.id,
      },
    }));
  };

  const askAnotherTooltip = t("askAnother.tooltip");
  const askAnotherAria = t("askAnother.aria");

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="always"
      // aui-user-action-bar-root
      className="text-muted-foreground data-floating:bg-background col-start-2 row-start-2 mt-2.5 mr-3 flex gap-2 items-end justify-self-end data-floating:absolute data-floating:mt-2 data-floating:rounded-md data-floating:border data-floating:p-1 data-floating:shadow-sm overflow-hidden whitespace-nowrap max-w-full"
    >
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
      <TooltipIconButton
        tooltip={askAnotherTooltip}
        delayDuration={200}
        onClick={handleAskAnother}
        aria-label={askAnotherAria}
        disabled={reachedMaxPanels}
      >
        <BotPlusIcon className="size-4" />
      </TooltipIconButton>
    </ActionBarPrimitive.Root>
  );
};
