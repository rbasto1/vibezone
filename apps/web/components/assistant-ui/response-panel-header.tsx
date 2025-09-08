"use client";

import { cn } from "@/components/ui/utils";
import { XIcon } from "lucide-react";

export interface PanelHeaderProps {
  panelId: string;
  modelId: string;
  onStop?: () => void;
}

import { usePanelsConfig, usePanelsStateSetter } from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import type { FC } from "react";
import { ModelDropdown } from "./model-dropdown";

export const PanelHeader: FC<PanelHeaderProps> = ({
  panelId,
  modelId,
  onStop,
}) => {
  const [panelsConfig, setPanelsConfig] = usePanelsConfig();
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();

  const handleRemovePanel = () => {
    const newPanels = panelsConfig.filter((p) => p.id !== panelId);
    setPanelsConfig(newPanels);
    setPanelsState((currentState) => {
      const newState = { ...currentState };
      delete newState[panelId];
      return newState;
    });
    saveLastModels(newPanels);
  };

  const canClose = panelsConfig.length > 1;

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
      <div className="flex items-center gap-2 min-w-0">
        <ModelDropdown panelId={panelId} modelId={modelId} />
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
            canClose ? "opacity-100" : "opacity-40 cursor-not-allowed"
          )}
          onClick={handleRemovePanel}
          aria-label="Close panel"
          title={canClose ? "Close panel" : "At least one panel must remain"}
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
