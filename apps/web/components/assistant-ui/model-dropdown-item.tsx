"use client";

import { cn } from "@/components/ui/utils";
import type { GetModelsListReturn } from "@/lib/trpc/models";
import { capabilityColor, capabilityOptions } from "./model-dropdown-constants";

interface ModelDropdownItemProps {
  model: GetModelsListReturn["models"][number];
  currentModelId?: string;
  onSelect: (providerId: string, modelId: string) => void;
  providerId: string;
  disabled?: boolean;
  muted?: boolean;
  titleText?: string;
}

export const ModelDropdownItem: React.FC<ModelDropdownItemProps> = ({
  model,
  currentModelId,
  onSelect,
  providerId,
  disabled = false,
  muted = false,
  titleText,
}) => {
  return (
    <div
      className={cn(
        "cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none",
        "hover:bg-accent hover:text-accent-foreground",
        model.id === currentModelId
          ? "bg-accent/50 font-semibold"
          : "font-medium",
        muted && "opacity-50",
        disabled && "cursor-not-allowed hover:bg-transparent"
      )}
      onClick={() => {
        if (disabled) return;
        onSelect(providerId, model.id);
      }}
      title={titleText}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex-1 min-w-0">
          <div className="truncate">{model.name}</div>
          <div className="mt-0.5 flex items-center gap-1">
            {capabilityOptions
              .filter((c) => Boolean((model as Record<string, unknown>)[c.id]))
              .map(({ id, Icon }) => (
                <Icon
                  key={id}
                  className={cn("h-3 w-3 opacity-85", capabilityColor[id])}
                />
              ))}
          </div>
        </span>
        <span className="flex items-center gap-1">
          {model.isIncluded ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
              Included
            </span>
          ) : null}
          {model.isPremium ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">
              Premium
            </span>
          ) : null}
          {model.isNew ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-800 dark:text-blue-300">
              New
            </span>
          ) : null}
          {model.isExperimental ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300">
              Experimental
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
};
