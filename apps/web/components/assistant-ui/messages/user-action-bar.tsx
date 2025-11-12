import { ActionBarPrimitive } from "@assistant-ui/react";
import { PencilIcon } from "lucide-react";
import type { FC } from "react";

import { TooltipIconButton } from "../../ui/tooltip-icon-button";

export const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      // aui-user-action-bar-root
      className="col-start-1 mt-2.5 mr-3 flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};
