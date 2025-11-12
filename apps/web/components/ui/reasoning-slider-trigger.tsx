"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReasoningEffort } from "@/db";
import { usePanelsConfigValue } from "@/hooks/use-panels";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useUser } from "@/lib/auth-client";
import { modelMap } from "@/lib/model-map";
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

type ReasoningEffortValue = Exclude<ReasoningEffort, "none">;

const normalizeReasoningEffort = (
  effort: ReasoningEffort
): ReasoningEffortValue => (effort === "none" ? "low" : effort);

export const ReasoningSliderTrigger = () => {
  const [preferences, setPreferences] = useUserPreferences();
  const [showReasoningSlider, setShowReasoningSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelsConfig = usePanelsConfigValue();
  const t = useTranslations("UserPreferences.reasoningEffort");
  const utils = trpc.useUtils();
  const user = useUser();
  const isLoggedIn = !!user;

  const handleSave = useCallback(
    (sliderValue: number) => {
      const reasoningEffort: ReasoningEffortValue =
        sliderValue <= 1 ? "low" : sliderValue === 2 ? "medium" : "high";
      if (!isLoggedIn) return;

      utils.client.users.updatePreferences
        .mutate({ reasoningEffort })
        .catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to update preferences";
          toast.error(message);
        });
    },
    [utils, isLoggedIn]
  );

  const { anyModelHasReasoning, blockingReasoningModelNames } = useMemo(() => {
    const blockingNames = new Set<string>();
    let hasReasoningModel = false;

    panelsConfig.forEach((panel) => {
      const model = modelMap.get(panel.model);

      if (model?.capReason) {
        hasReasoningModel = true;
        return;
      }

      const modelName = model?.name ?? panel.model;
      blockingNames.add(modelName);
    });

    return {
      anyModelHasReasoning: hasReasoningModel,
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

  const disabledTooltipMessage = !anyModelHasReasoning
    ? t("disabledTooltip")
    : blockingReasoningModelNames.length === 0
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
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div ref={containerRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowReasoningSlider((prev) => !prev)}
            disabled={!anyModelHasReasoning}
            aria-label={t("label")}
            className="h-8 w-8 rounded-full p-1 hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30"
          >
            <BrainIcon className="size-5" />
          </Button>
          {showReasoningSlider && (
            <ReasoningSlider
              onReasoningEffortChange={onReasoningEffortChange}
              sliderValue={sliderValue}
              onSave={handleSave}
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {(disabledTooltipMessage ?? t("label")).split("\n").map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
};
