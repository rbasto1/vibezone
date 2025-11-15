import { ActionBarPrimitive, MessagePrimitive } from "@assistant-ui/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { FC } from "react";

import { useTranslations } from "next-intl";
import { TooltipIconButton } from "../../ui/tooltip-icon-button";

export const UserActionBar: FC = () => {
  const t = useTranslations("Message");

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="always"
      // aui-user-action-bar-root
      className="col-start-2 row-start-2 mt-2.5 mr-3 flex gap-2 items-end"
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
    </ActionBarPrimitive.Root>
  );
};
