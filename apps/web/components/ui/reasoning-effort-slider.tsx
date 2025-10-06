"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { models } from "@/generated/models";
import { usePanelsConfigValue } from "@/hooks/use-panels";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { BrainIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

const formatModelNames = (
  names: string[],
  t: ReturnType<typeof useTranslations>
) => {
  if (!names.length) return t("selectedModels");
  return names.map((name) => `• ${name}`).join("\n");
};

export const ReasoningEffortSlider = () => {
  const [preferences, setPreferences] = useUserPreferences();
  const [showReasoningSlider, setShowReasoningSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelsConfig = usePanelsConfigValue();
  const { allModelsHaveReasoning, blockingReasoningModelNames } =
    useMemo(() => {
      const blockingNames = new Set<string>();

      panelsConfig.forEach((panel) => {
        const model = models.models.find((m) => m.id === panel.model);
        const modelName = model?.name ?? panel.model;
        if (!model?.capReason) {
          blockingNames.add(modelName);
        }
      });

      return {
        allModelsHaveReasoning: blockingNames.size === 0,
        blockingReasoningModelNames: Array.from(blockingNames).sort((a, b) =>
          a.localeCompare(b)
        ),
      };
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

  const disabledTooltipMessage = allModelsHaveReasoning
    ? undefined
    : `${t(
        blockingReasoningModelNames.length === 1
          ? "disabledTooltipSingle"
          : "disabledTooltipPlural"
      )}\n${formatModelNames(blockingReasoningModelNames, t)}`;

  const reasoningEffort = preferences.reasoningEffort;
  const normalizedReasoningEffort =
    reasoningEffort === "none" ? "low" : reasoningEffort;
  const sliderValue =
    normalizedReasoningEffort === "low"
      ? 1
      : normalizedReasoningEffort === "medium"
        ? 2
        : 3;
  const onReasoningEffortChange = (
    effort: Exclude<typeof reasoningEffort, "none">
  ) => {
    setPreferences((prev) => ({ ...prev, reasoningEffort: effort }));
  };

  return (
    <div ref={containerRef} className="relative">
      <Tooltip delayDuration={100}>
        <TooltipTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowReasoningSlider(!showReasoningSlider)}
            disabled={!allModelsHaveReasoning}
            aria-label={t("label")}
            className="size-[34px] rounded-full p-1 hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30"
          >
            <BrainIcon className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {allModelsHaveReasoning
            ? t("label")
            : (disabledTooltipMessage ?? t("disabledTooltip"))
                .split("\n")
                .map((line, idx) => <p key={idx}>{line}</p>)}
        </TooltipContent>
      </Tooltip>
      {showReasoningSlider && (
        <div className="absolute bottom-8 -left-[50%] bg-background border rounded p-2 shadow-lg">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs">{t("high")}</span>
            <input
              type="range"
              min="1"
              max="3"
              value={sliderValue}
              onChange={(e) => {
                const value = Number(e.target.value);
                const effort =
                  value <= 1 ? "low" : value === 2 ? "medium" : "high";
                onReasoningEffortChange(effort);
              }}
              className="w-12 h-12 -rotate-90"
            />
            <span className="text-xs">{t("low")}</span>
          </div>
        </div>
      )}
    </div>
  );
};
