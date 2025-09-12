"use client";

import type { Model, Provider } from "@/db";
import { ArrowDown, ArrowUp, X } from "lucide-react";

interface GroupModelsListItemProps {
  model: Pick<Model, "id" | "name"> & {
    provider: Pick<Provider, "name">;
  };
  index: number;
  totalModels: number;
  onMoveModel?: (modelId: string, direction: "up" | "down") => void;
  onRemoveModel?: (modelId: string) => void;
}

export function GroupModelsListItem({
  model,
  index,
  totalModels,
  onMoveModel,
  onRemoveModel,
}: GroupModelsListItemProps) {
  const isEditing = !onRemoveModel;
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border bg-background ${
        isEditing ? "opacity-50" : ""
      }`}
    >
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onMoveModel?.(model.id, "up")}
          disabled={index === 0 || isEditing}
          className="p-1 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          onClick={() => onMoveModel?.(model.id, "down")}
          disabled={index === totalModels - 1 || isEditing}
          className="p-1 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1">
        <div className="font-medium">{model.id}</div>
        <div className="text-sm text-muted-foreground">
          {model.provider.name} - {model.name}
        </div>
      </div>
      <button
        onClick={() => onRemoveModel?.(model.id)}
        disabled={isEditing}
        className="p-2 rounded hover:bg-destructive/10 text-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Remove from group"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
