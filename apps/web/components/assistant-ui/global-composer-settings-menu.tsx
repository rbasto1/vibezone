"use client";

import { AddAiButton } from "@/components/assistant-ui/add-ai-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReasoningSliderTrigger } from "@/components/ui/reasoning-slider-trigger";
import { cn } from "@/components/ui/utils";
import { Settings2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FC } from "react";

interface GlobalComposerSettingsMenuProps {
  onAddPanel?: () => void;
  className?: string;
}

export const GlobalComposerSettingsMenu: FC<
  GlobalComposerSettingsMenuProps
> = ({ onAddPanel, className }) => {
  const t = useTranslations("GlobalComposer");
  const [open, setOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const handleAddPanel = () => {
    onAddPanel?.();
    setSelectorOpen(false);
    setOpen(false);
  };

  return (
    <DropdownMenu
      open={open || selectorOpen}
      onOpenChange={(next) => {
        if (!next && selectorOpen) {
          setSelectorOpen(false);
        }
        setOpen(next);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full text-xs font-semibold hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30",
            className
          )}
          aria-label={t("settingsLabel")}
        >
          <Settings2Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        forceMount
        className="flex min-w-0 flex-col items-center gap-1.5 overflow-visible p-2"
      >
        <ReasoningSliderTrigger />
        <AddAiButton onAddPanel={handleAddPanel} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
