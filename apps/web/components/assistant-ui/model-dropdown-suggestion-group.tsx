"use client";

import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { cn } from "@/components/ui/utils";
import type { SuggestionGroup } from "@/db";

interface ModelDropdownSuggestionGroupProps {
  group: Pick<SuggestionGroup, "id" | "title" | "label" | "icon">;
  isActive: boolean;
  onSelect: (groupId: string) => void;
}

export const ModelDropdownSuggestionGroup: React.FC<
  ModelDropdownSuggestionGroupProps
> = ({ group, isActive, onSelect }) => {
  return (
    <button
      key={group.id}
      className={cn(
        "h-8 text-xs inline-flex items-center gap-1.5 rounded-[6px] cursor-pointer",
        "transition-all duration-200 ease-in-out overflow-hidden",
        isActive
          ? "bg-primary text-primary-foreground px-2"
          : "text-foreground/80 hover:bg-background/50 px-2"
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(group.id);
      }}
      title={isActive ? group.label : `${group.title} - ${group.label}`}
    >
      <DynamicIcon iconName={group.icon} size={14} />
      <span
        className={cn(
          "truncate transition-all duration-200 ease-in-out",
          isActive ? "max-w-[80px] opacity-100" : "max-w-0 opacity-0"
        )}
      >
        {group.title}
      </span>
    </button>
  );
};
