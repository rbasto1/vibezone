"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { reasoningEffort as reasoningEffortEnum } from "@/db/enums";
import { models } from "@/generated/models";
import { usePanelsConfigValue } from "@/hooks/use-panels";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { trpc } from "@/lib/trpc/client";
import { BrainIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ReasoningSlider } from "./reasoning-slider";

const formatModelNames = (
  names: string[],
  t: ReturnType<typeof useTranslations>
) => {
  if (!names.length) return t("selectedModels");
  return names.map((name) => `• ${name}`).join("\n");
};

type ReasoningEffortEnumValue = (typeof reasoningEffortEnum.enumValues)[number];
type ReasoningEffortValue = Exclude<ReasoningEffortEnumValue, "none">;

const normalizeReasoningEffort = (
  effort: ReasoningEffortEnumValue
): ReasoningEffortValue => (effort === "none" ? "low" : effort);

export const ReasoningSliderTrigger = () => {
  const [preferences, setPreferences] = useUserPreferences();
  const [showReasoningSlider, setShowReasoningSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelsConfig = usePanelsConfigValue();
  const t = useTranslations("UserPreferences.reasoningEffort");
  const utils = trpc.useUtils();

  const handleSave = useCallback(
    (sliderValue: number) => {
      const reasoningEffort: ReasoningEffortValue =
        sliderValue <= 1 ? "low" : sliderValue === 2 ? "medium" : "high";
      utils.client.users.updatePreferences
        .mutate({ reasoningEffort })
        .catch((error) => {
          toast.error(error.message || "Failed to update preferences");
        });
    },
    [utils]
  );

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

  useEffect(() => {
    if (!showReasoningSlider) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowReasoningSlider(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

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
  const normalizedReasoningEffort = normalizeReasoningEffort(reasoningEffort);
  const sliderValue =
    normalizedReasoningEffort === "low"
      ? 1
      : normalizedReasoningEffort === "medium"
        ? 2
        : 3;
  const onReasoningEffortChange = (effort: ReasoningEffortValue) => {
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
            onClick={() => setShowReasoningSlider((prev) => !prev)}
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
        <ReasoningSlider
          onReasoningEffortChange={onReasoningEffortChange}
          sliderValue={sliderValue}
          onSave={handleSave}
        />
      )}
    </div>
  );
};
