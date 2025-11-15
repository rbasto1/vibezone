"use client";

import { Button } from "@/components/ui/button";
import { Instruction } from "@/components/ui/instruction";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "@/components/ui/utils";
import type { InstructionConfig } from "@/store/instructions";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AsteriskIcon, GripVertical, PencilIcon, Trash2 } from "lucide-react";
import type { FC } from "react";

interface InstructionItemProps {
  instruction: InstructionConfig;
  projectLabel: string;
  projectColor?: string | null;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export const InstructionItem: FC<InstructionItemProps> = ({
  instruction,
  projectLabel,
  projectColor,
  onToggle,
  onDelete,
  onEdit,
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
        "rounded-lg border p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-ring/40 overflow-y-scroll bg-background",
        sortable.isDragging ? "opacity-75 shadow-lg" : "opacity-100",
        instruction.isActive ? "border-border" : "border-dashed border-muted"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grabbing"
          ref={sortable.setActivatorNodeRef}
          {...sortable.listeners}
          {...sortable.attributes}
          aria-label="Reorder instruction"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {instruction.title}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {projectColor ? (
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ backgroundColor: projectColor }}
                  />
                ) : (
                  <AsteriskIcon className="size-3.5 -mr-1" />
                )}
                <span className="truncate">{projectLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ToggleSwitch
                checked={instruction.isActive}
                onChange={(checked) => onToggle(instruction.id, checked)}
                label="Toggle instruction"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(instruction.id)}
                aria-label="Edit instruction"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(instruction.id)}
                aria-label="Delete instruction"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Instruction content={instruction.content} />
        </div>
      </div>
    </div>
  );
};
