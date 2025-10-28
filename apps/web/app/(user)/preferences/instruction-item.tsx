"use client";

import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import type { InstructionConfig } from "@/store/instructions";
import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FC } from "react";

interface InstructionItemProps {
  instruction: InstructionConfig;
  projectLabel: string;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  togglePending: boolean;
  deletePending: boolean;
}

export const InstructionItem: FC<InstructionItemProps> = ({
  instruction,
  projectLabel,
  onToggle,
  onDelete,
  togglePending,
  deletePending,
}) => {
  const sortable = useSortable({ id: instruction.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  } as const;

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-ring/40",
        sortable.isDragging ? "opacity-75 shadow-lg" : "opacity-100",
        instruction.isActive ? "border-border" : "border-dashed border-muted",
        "bg-background"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          ref={sortable.setActivatorNodeRef}
          {...sortable.listeners}
          {...sortable.attributes}
          aria-label="Reorder instruction"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {instruction.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {projectLabel}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ToggleSwitch
                checked={instruction.isActive}
                onChange={(checked) => onToggle(instruction.id, checked)}
                disabled={togglePending}
                label="Toggle instruction"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onDelete(instruction.id)}
                disabled={deletePending}
                aria-label="Delete instruction"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {instruction.content}
          </p>
        </div>
      </div>
    </div>
  );
};
