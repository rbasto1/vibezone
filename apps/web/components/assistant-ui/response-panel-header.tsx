"use client";

import { cn } from "@/components/ui/utils";
import { modelsAtom } from "@/store/models";
import { useAtomValue } from "jotai";
import { XIcon } from "lucide-react";

export interface PanelHeaderProps {
  modelId: string;
  onClose?: () => void;
  onChangeModel: (providerId: string, modelId: string) => void;
  onStop?: () => void;
}

import type { FC } from "react";
import { ModelDropdown } from "./model-dropdown";

export const PanelHeader: FC<PanelHeaderProps> = ({
  modelId,
  onClose,
  onChangeModel,
  onStop,
}) => {
  const modelsResponse = useAtomValue(modelsAtom);
  const models = modelsResponse.models;
  const modelLabel = models.find((m) => m.id === modelId)?.name ?? modelId;

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
      <div className="flex items-center gap-2 min-w-0">
        {onChangeModel ? (
          <ModelDropdown modelId={modelId} onChangeModel={onChangeModel} />
        ) : (
          <div className="font-medium truncate">{modelLabel}</div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onStop && (
          <button
            className="p-1 rounded hover:bg-muted"
            onClick={onStop}
            aria-label="Stop streaming"
            title="Stop streaming"
          >
            {/* stop icon as a square */}
            <span className="inline-block h-4 w-4 bg-foreground/80" />
          </button>
        )}
        <button
          className={cn(
            "p-1 rounded hover:bg-muted",
            onClose ? "opacity-100" : "opacity-40 cursor-not-allowed"
          )}
          onClick={onClose}
          aria-label="Close panel"
          title={onClose ? "Close panel" : "At least one panel must remain"}
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
