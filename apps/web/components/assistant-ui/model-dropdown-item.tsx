"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/components/ui/utils";
import type { GetModelsListReturn } from "@/lib/trpc/models";
import { ShieldAlertIcon } from "lucide-react";
import { capabilityOptions } from "./model-dropdown-constants";
import {
  ExperimentalTag,
  FreeTag,
  IncludedTag,
  NewTag,
  PremiumTag,
} from "./tags";
import { useTranslations } from "next-intl";

interface ModelDropdownItemProps {
  model: GetModelsListReturn["models"][number];
  selected: boolean;
  onSelect: (providerId: string, modelId: string) => void;
  providerId: string;
  disabled?: boolean;
  muted?: boolean;
  titleText?: string;
  showRetentionWarning?: boolean;
}

export const ModelDropdownItem: React.FC<ModelDropdownItemProps> = ({
  model,
  selected,
  onSelect,
  providerId,
  disabled = false,
  muted = false,
  titleText,
  showRetentionWarning = false,
}) => {
  const t = useTranslations("ModelDropdown");
  return (
    <div
      className={cn(
        "cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none",
        "hover:bg-accent hover:text-accent-foreground",
        selected ? "bg-accent/50 font-semibold" : "font-medium",
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
              .map(({ id, Icon, color }) => (
                <Icon key={id} className={cn("h-3 w-3 opacity-85", color)} />
              ))}
            {showRetentionWarning && (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <ShieldAlertIcon
                    className="h-3 w-3 text-red-500"
                    aria-label={t("retentionIconAria")}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t.rich("retentionTooltip", {
                    lineBreak: () => <br />,
                  })}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </span>
        <span className="flex items-center gap-1">
          {model.isFree && <FreeTag />}
          {model.isIncluded && <IncludedTag />}
          {model.isPremium && <PremiumTag />}
          {model.isNew && <NewTag />}
          {model.isExperimental && <ExperimentalTag />}
        </span>
      </div>
    </div>
  );
};
