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
  const t = useTranslations("UserPreferences.reasoningEffort");
  const initialValue = useRef(sliderValue);
  const currentValue = useRef(sliderValue);

  useEffect(() => {
    currentValue.current = sliderValue;
  }, [sliderValue]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (initialValue.current !== currentValue.current) {
        onSave(currentValue.current);
      }
    };
  }, [onSave]);

  return (
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
            const effort = value <= 1 ? "low" : value === 2 ? "medium" : "high";
            onReasoningEffortChange(effort);
          }}
          className="w-12 h-12 -rotate-90"
        />
        <span className="text-xs">{t("low")}</span>
      </div>
    </div>
  );
};
