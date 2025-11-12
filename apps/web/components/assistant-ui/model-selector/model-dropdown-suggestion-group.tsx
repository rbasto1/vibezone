"use client";

import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { cn } from "@/components/ui/utils";
import type { GetModelsListReturn } from "@/lib/trpc/models";
import { useLocale } from "next-intl";
import { Button } from "../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

interface ModelDropdownSuggestionGroupProps {
  group: Pick<
    GetModelsListReturn["groups"][number],
    "id" | "icon" | "translations"
  >;
  isActive: boolean;
  onSelect: (groupId: string) => void;
}

export const ModelDropdownSuggestionGroup: React.FC<
  ModelDropdownSuggestionGroupProps
> = ({ group, isActive, onSelect }) => {
  const locale = useLocale();
  const translation =
    group.translations.find((t) => t.localeId === locale) ??
    group.translations.find((t) => t.localeId === "en");
  const { title, label } = translation ?? { title: group.id, label: "" };
  return (
    <Tooltip>
      <TooltipContent side="bottom">
        {isActive ? label : `${title} - ${label}`}
      </TooltipContent>
      <TooltipTrigger asChild>
        <Button
          key={group.id}
          variant="ghost"
          className={cn(
            "h-8 transition-all duration-200 ease-in-out overflow-hidden",
            isActive
              ? "bg-primary text-primary-foreground hover:bg-primary! hover:text-primary-foreground px-2"
              : "text-foreground/80 hover:bg-background/50 px-2 -mr-2"
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(group.id);
          }}
        >
          <DynamicIcon iconName={group.icon} size={14} />
          <span
            className={cn(
              "truncate transition-all duration-200 ease-in-out",
              isActive ? "max-w-[80px] opacity-100" : "max-w-0 opacity-0"
            )}
          >
            {title}
          </span>
        </Button>
      </TooltipTrigger>
    </Tooltip>
  );
};
