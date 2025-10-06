"use client";

import { Button } from "@/components/ui/button";
import { models } from "@/generated/models";
import { usePanelsConfigValue } from "@/hooks/use-panels";
import { BrainIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

interface ReasoningEffortSliderProps {
  reasoningEffort: "none" | "low" | "medium" | "high";
  onReasoningEffortChange: (effort: "none" | "low" | "medium" | "high") => void;
}

export const ReasoningEffortSlider: React.FC<ReasoningEffortSliderProps> = ({
  reasoningEffort,
  onReasoningEffortChange,
}) => {
  const [showReasoningSlider, setShowReasoningSlider] = useState(false);
  const panelsConfig = usePanelsConfigValue();
  const hasReasoningModels = useMemo(() => {
    return Object.values(panelsConfig).some((panel) => {
      const model = models.models.find((m) => m.id === panel.model);
      return model?.capReason;
    });
  }, [panelsConfig]);
  const t = useTranslations("GlobalComposer");

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setShowReasoningSlider(!showReasoningSlider)}
        disabled={!hasReasoningModels}
        title={t("reasoningEffort.title")}
        className="h-8 w-8"
      >
        <BrainIcon className="h-4 w-4" />
      </Button>
      {showReasoningSlider && (
        <div className="absolute bottom-12 left-8 bg-background border rounded p-2 shadow-lg">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs">High</span>
            <input
              type="range"
              min="0"
              max="3"
              value={
                reasoningEffort === "none"
                  ? 0
                  : reasoningEffort === "low"
                    ? 1
                    : reasoningEffort === "medium"
                      ? 2
                      : 3
              }
              onChange={(e) => {
                const value = parseInt(e.target.value);
                const effort =
                  value === 0
                    ? "none"
                    : value === 1
                      ? "low"
                      : value === 2
                        ? "medium"
                        : "high";
                onReasoningEffortChange(effort);
              }}
              className="w-12 h-12 -rotate-90"
            />
            <span className="text-xs">None</span>
          </div>
        </div>
      )}
    </>
  );
};
