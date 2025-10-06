"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { models } from "@/generated/models";
import { usePanelsConfigValue } from "@/hooks/use-panels";
import { BrainIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

interface ReasoningEffortSliderProps {
  reasoningEffort: "none" | "low" | "medium" | "high";
  onReasoningEffortChange: (effort: "none" | "low" | "medium" | "high") => void;
}

export const ReasoningEffortSlider: React.FC<ReasoningEffortSliderProps> = ({
  reasoningEffort,
  onReasoningEffortChange,
}) => {
  const [showReasoningSlider, setShowReasoningSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelsConfig = usePanelsConfigValue();
  const allModelsHaveReasoning = useMemo(() => {
    return Object.values(panelsConfig).every((panel) => {
      const model = models.models.find((m) => m.id === panel.model);
      return model?.capReason;
    });
  }, [panelsConfig]);
  const t = useTranslations("UserPreferences.reasoningEffort");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowReasoningSlider(false);
      }
    };

    if (showReasoningSlider) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReasoningSlider]);

  return (
    <div ref={containerRef} className="relative">
      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowReasoningSlider(!showReasoningSlider)}
            disabled={!allModelsHaveReasoning}
            className="h-8 w-8"
          >
            <BrainIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {allModelsHaveReasoning ? t("label") : t("disabledTooltip")}
        </TooltipContent>
      </Tooltip>
      {showReasoningSlider && (
        <div className="absolute bottom-8 -left-[50%] bg-background border rounded p-2 shadow-lg">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs">{t("high")}</span>
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
                const value = Number(e.target.value);
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
            <span className="text-xs">{t("none")}</span>
          </div>
        </div>
      )}
    </div>
  );
};
