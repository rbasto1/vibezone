import type { FC } from "react";

import { cn } from "@/components/ui/utils";

interface PreferenceRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
}

export const PreferenceRow: FC<PreferenceRowProps> = ({
  id,
  label,
  description,
  checked,
  onToggle,
}: PreferenceRowProps) => {
  const labelId = `${id}-label`;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="space-y-1" id={labelId}>
        <span className="text-sm font-medium">{label}</span>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <PreferenceToggle
        id={id}
        checked={checked}
        onToggle={onToggle}
        ariaLabelledBy={labelId}
      />
    </div>
  );
};

interface PreferenceToggleProps {
  id: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
  ariaLabelledBy?: string;
}

const PreferenceToggle = ({
  id,
  checked,
  onToggle,
  ariaLabelledBy,
}: PreferenceToggleProps) => {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
      onClick={() => onToggle(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border transition",
        checked ? "border-primary bg-primary" : "border-border bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 translate-x-1 rounded-full bg-background shadow transition",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
};
