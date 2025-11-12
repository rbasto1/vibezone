"use client";

import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { cn } from "@/components/ui/utils";
import { StarIcon } from "lucide-react";

interface ModelFavoriteButtonProps {
  selected: boolean;
  onClick: () => void;
  title: string;
}

export const ModelFavoriteButton: React.FC<ModelFavoriteButtonProps> = ({
  selected,
  onClick,
  title,
}) => {
  return (
    <TooltipIconButton
      type="button"
      variant={selected ? "default" : "ghost"}
      size="sm"
      className={cn(
        "h-8 w-8 p-0",
        selected
          ? "bg-background text-yellow-500 shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-pressed={selected}
      tooltip={title}
      aria-label={title}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <StarIcon
        className={cn(
          "h-4 w-4",
          selected ? "fill-current" : "fill-transparent"
        )}
      />
    </TooltipIconButton>
  );
};
