import type { ChangeEvent, FC } from "react";

import { cn } from "@/components/ui/utils";
import type { ReasoningEffort } from "@/db";

export type ReasoningEffortValue = Exclude<ReasoningEffort, "none">;

interface ReasoningEffortSliderProps {
  effort: ReasoningEffortValue;
  onChange: (value: ReasoningEffortValue) => void;
  label: string;
  description: string;
  lowLabel: string;
  mediumLabel: string;
  highLabel: string;
}

export const ReasoningEffortSlider: FC<ReasoningEffortSliderProps> = ({
  effort,
  onChange,
  label,
  description,
  lowLabel,
  mediumLabel,
  highLabel,
}: ReasoningEffortSliderProps) => {
  const sliderValue = effort === "low" ? 1 : effort === "medium" ? 2 : 3;
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    const nextEffort = value <= 1 ? "low" : value === 2 ? "medium" : "high";
    onChange(nextEffort);
  };
  const labelledBy = "reasoning-effort-label";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="space-y-1" id={labelledBy}>
        <span className="text-sm font-medium">{label}</span>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={3}
            step={1}
            value={sliderValue}
            onChange={handleChange}
            aria-labelledby={labelledBy}
            aria-valuetext={
              sliderValue === 1
                ? lowLabel
                : sliderValue === 2
                  ? mediumLabel
                  : highLabel
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span
            className={cn(
              "transition-colors",
              sliderValue === 1 && "text-foreground font-medium"
            )}
          >
            {lowLabel}
          </span>
          <span
            className={cn(
              "transition-colors",
              sliderValue === 2 && "text-foreground font-medium"
            )}
          >
            {mediumLabel}
          </span>
          <span
            className={cn(
              "transition-colors",
              sliderValue === 3 && "text-foreground font-medium"
            )}
          >
            {highLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
