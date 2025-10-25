import type { ReasoningEffort } from "@/db";
import { useTranslations } from "next-intl";

import { useEffect, useRef } from "react";

type ReasoningEffortValue = Exclude<ReasoningEffort, "none">;

interface ReasoningSliderProps {
  onReasoningEffortChange: (effort: ReasoningEffortValue) => void;
  sliderValue: number;
  onSave: (sliderValue: number) => void;
}

export const ReasoningSlider: React.FC<ReasoningSliderProps> = ({
  onReasoningEffortChange,
  sliderValue,
  onSave,
}) => {
  // We separate the state into this component so that we only call the tRPC function to save the value
  // when the component is closed, not at each interaction with the slider
  const t = useTranslations("UserPreferences.reasoningEffort");
  const initialValue = useRef(sliderValue);
  const currentValue = useRef(sliderValue);
  currentValue.current = sliderValue;

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (initialValue.current !== currentValue.current) {
        onSave(currentValue.current);
      }
    };
  }, [onSave]);

  return (
    <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-md border bg-background p-3 shadow-lg">
      <div className="flex w-40 flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("low")}</span>
          <span>{t("high")}</span>
        </div>
        <input
          type="range"
          min="1"
          max="3"
          value={sliderValue}
          onChange={(e) => {
            const value = Number(e.target.value);
            const effort = value <= 1 ? "low" : value === 2 ? "medium" : "high";
            onReasoningEffortChange(effort);
          }}
          className="w-full accent-primary"
        />
      </div>
    </div>
  );
};
