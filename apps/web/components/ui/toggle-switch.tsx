"use client";

import { cn } from "./utils";
import type { FC } from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const ToggleSwitch: FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled,
  label,
  className,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        checked ? "border-primary bg-primary" : "border-input bg-input",
        disabled ? "opacity-50" : "cursor-pointer",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </button>
  );
};
