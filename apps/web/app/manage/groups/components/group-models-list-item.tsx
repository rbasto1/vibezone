"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import type { Model, Provider } from "@/db";
import { ChevronsDown, ChevronsUp, GripVertical, X } from "lucide-react";
import type { DragEvent } from "react";

interface GroupModelsListItemProps {
  model: Pick<Model, "id" | "name"> & {
    provider: Pick<Provider, "name">;
  };
  index: number;
  totalModels: number;
  onMoveModel?: (modelId: string, targetIndex: number) => void;
  onRemoveModel?: (modelId: string) => void;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  draggingDisabled?: boolean;
  isDragging?: boolean;
}

export function GroupModelsListItem({
  model,
  index,
  totalModels,
  onMoveModel,
  onRemoveModel,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggingDisabled,
  isDragging,
}: GroupModelsListItemProps) {
  const isEditing = !onRemoveModel;
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-background transition-colors",
        (isEditing || draggingDisabled) && "opacity-50 cursor-not-allowed",
        !draggingDisabled && !isEditing && "hover:bg-accent/50",
        isDragging && "border-primary/60 opacity-75",
        index < 3 && "border-green-700"
      )}
    >
      <div className="flex gap-2 items-center">
        <div
          className={cn(
            "flex h-full items-center text-muted-foreground",
            isEditing || draggingDisabled
              ? "opacity-60"
              : "cursor-grab active:cursor-grabbing"
          )}
          draggable={!isEditing && !draggingDisabled}
          onDragStart={isEditing ? undefined : onDragStart}
          onDragEnd={isEditing ? undefined : onDragEnd}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onMoveModel?.(model.id, 0)}
            disabled={index === 0 || isEditing || !!draggingDisabled}
            className="p-1 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            title="Move to top"
          >
            <ChevronsUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => onMoveModel?.(model.id, totalModels - 1)}
            disabled={index === totalModels - 1 || isEditing || !!draggingDisabled}
            className="p-1 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            title="Move to bottom"
          >
            <ChevronsDown className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="flex-1">
        <div className="font-medium">{model.id}</div>
        <div className="text-sm text-muted-foreground">
          {model.provider.name} - {model.name}
        </div>
      </div>
      <Button
        variant="ghost"
        className="hover:bg-destructive/10 text-destructive hover:text-destructive-foreground transition-colors"
        onClick={() => onRemoveModel?.(model.id)}
        disabled={isEditing}
        title="Remove from group"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
