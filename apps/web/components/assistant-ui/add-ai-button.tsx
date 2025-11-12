import type { FC } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { useAddAi } from "@/hooks/use-add-ai";
import { BotPlusIcon } from "../ui/icons/bot-plus-icon";
import { ShortcutHint } from "../ui/shortcut-hint";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface AddAiButtonProps {
  onAddPanel?: () => void;
}

export const AddAiButton: FC<AddAiButtonProps> = ({ onAddPanel }) => {
  const {
    addButtonAriaLabel,
    addButtonLabel,
    addButtonTitle,
    canAddMore,
    openAddAiSelector,
  } = useAddAi({ onAddPanel });

  const triggerClassName = cn(
    "h-8 w-8 rounded-full border border-transparent hover:border-border hover:bg-accent/40",
    !canAddMore && "opacity-60 cursor-not-allowed"
  );

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName}
          disabled={!canAddMore}
          aria-label={addButtonAriaLabel}
          onClick={() => openAddAiSelector()}
        >
          <BotPlusIcon />
          <span className="sr-only">{addButtonLabel}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {addButtonTitle}
        <ShortcutHint combo={["cmdOrCtrl", "M"]} className="ml-2" />
      </TooltipContent>
    </Tooltip>
  );
};
