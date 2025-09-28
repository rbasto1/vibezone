"use client";

import { XIcon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";

import { StopButton } from "@/components/ui/stop-button";
import { cn } from "@/components/ui/utils";
import {
  usePanelsConfig,
  usePanelsStateSetter,
  usePanelStateValue,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import type { PanelConfig } from "@/store/panels";
import { ConfirmCloseModal } from "./confirm-close-modal";
import { ModelDropdown } from "./model-dropdown";

export interface PanelHeaderProps {
  panel: PanelConfig;
  onStop?: () => void;
}

export const PanelHeader: FC<PanelHeaderProps> = ({ panel, onStop }) => {
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();
  const panelId = panel.id;
  const modelId = panel.model;
  const [panelsConfig, setPanelsConfig] = usePanelsConfig();
  const panelState = usePanelStateValue(panelId);

  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const handleRemoveClick = () => {
    if (panelState.hasMessages) {
      setShowConfirmClose(true);
    } else {
      removePanel();
    }
  };

  const removePanel = () => {
    setPanelsConfig((prev) => {
      const next = prev.filter((p) => p.id !== panelId);
      saveLastModels(next);
      return next;
    });
    setPanelsState((currentState) => {
      const newState = { ...currentState };
      delete newState[panelId];
      return newState;
    });
    setShowConfirmClose(false);
  };

  const canClose = panelsConfig.length > 1;

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40 gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <ModelDropdown
          panelId={panelId}
          modelId={modelId}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex items-center gap-1">
        {onStop && (
          <StopButton
            onClick={onStop}
            aria-label="Stop streaming"
            title="Stop streaming this AI response"
          />
        )}
        <button
          className={cn(
            "p-1 rounded hover:bg-muted cursor-pointer",
            canClose ? "opacity-100" : "opacity-40 cursor-not-allowed"
          )}
          onClick={handleRemoveClick}
          aria-label="Close panel"
          title={canClose ? "Close panel" : "At least one panel must remain"}
          disabled={!canClose}
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
      {showConfirmClose && (
        <ConfirmCloseModal
          onOpenChange={setShowConfirmClose}
          onConfirm={removePanel}
        />
      )}
    </div>
  );
};
