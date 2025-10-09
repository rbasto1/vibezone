"use client";

import { InfoIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StopButton } from "@/components/ui/stop-button";
import { cn } from "@/components/ui/utils";
import {
  usePanelsConfig,
  usePanelsStateSetter,
  usePanelStateValue,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import type { PanelConfig } from "@/store/panels";
import { ConfirmCloseModal } from "./confirm-close-modal";
import { ModelDropdown } from "./model-dropdown";

export interface PanelHeaderProps {
  panel: PanelConfig;
  onStop?: () => void;
}

export const PanelHeader: FC<PanelHeaderProps> = ({ panel, onStop }) => {
  const t = useTranslations("ResponsePanelHeader");
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();
  const panelId = panel.id;
  const modelId = panel.model;
  const [panelsConfig, setPanelsConfig] = usePanelsConfig();
  const panelState = usePanelStateValue(panelId);

  const preferences = useUserPreferencesValue();

  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const setUIState = useUIStateSetter();

  const infoLabel = t("infoShowDetails");

  const handleRemoveClick = () => {
    if (
      panelState.hasMessages &&
      !preferences.skipCloseThreadConfirmation
    ) {
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
  const stopLabel = t("stopLabel");
  const closeAria = t("closeAria");
  const closeTooltip = canClose ? t("closeTooltip") : t("closeDisabledTooltip");

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
            aria-label={stopLabel}
            title={stopLabel}
          />
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-8 h-8"
          onClick={() => setUIState({ detailsModelId: modelId })}
          title={infoLabel}
          aria-label={infoLabel}
        >
          <InfoIcon className="h-4 w-4" />
        </Button>
        <button
          className={cn(
            "p-1 rounded hover:bg-muted cursor-pointer",
            canClose ? "opacity-100" : "opacity-40 cursor-not-allowed"
          )}
          onClick={handleRemoveClick}
          aria-label={closeAria}
          title={closeTooltip}
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
