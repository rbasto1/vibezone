import type { FC } from "react";

import { Button } from "@/components/ui/button";
import { ShortcutHint } from "@/components/ui/shortcut-hint";
import { cn } from "@/components/ui/utils";
import { useAddAi } from "@/hooks/use-add-ai";
import { BotPlusIcon } from "../ui/icons/bot-plus-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface AddAiButtonProps {
  onAddPanel?: (id: string) => void;
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
    canAddMore ? "" : "opacity-60 cursor-not-allowed"
  );

  return (
    <div className="flex items-center gap-2">
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={triggerClassName}
            disabled={!canAddMore}
            aria-label={addButtonAriaLabel}
            type="button"
            onClick={() => openAddAiSelector()}
          >
            <BotPlusIcon />
            <span className="sr-only">{addButtonLabel}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{addButtonTitle}</TooltipContent>
      </Tooltip>
      <ShortcutHint combo={["cmdOrCtrl", "M"]} />
    </div>
  );
};
