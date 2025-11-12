"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/components/ui/utils";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import type { GetModelsListReturn } from "@/lib/trpc/models";
import { InfoIcon, ShieldAlertIcon, Star } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  ExperimentalTag,
  FreeTag,
  IncludedTag,
  NewTag,
  PremiumTag,
} from "../tags";
import { capabilityOptions } from "./model-dropdown-constants";

interface ModelDropdownItemProps {
  model: GetModelsListReturn["models"][number];
  selected: boolean;
  onSelect: (providerId: string, modelId: string) => void;
  providerId: string;
  disabled?: boolean;
  muted?: boolean;
  titleText?: string;
  showRetentionWarning?: boolean;
  isFavorite?: boolean;
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
  isFavorite = false,
}) => {
  const t = useTranslations("ModelDropdown");
  const infoLabel = t("info.openDetails");
  const setUIState = useUIStateSetter();

  return (
    <div
      className={cn(
        "cursor-pointer select-none rounded-sm px-1 py-1.5 text-sm outline-none",
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
      <div className="flex items-start justify-between gap-2">
        {isFavorite && (
          <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0 mt-0.5" />
        )}
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
          <div title={infoLabel}>
            <InfoIcon
              className="text-muted-foreground transition-colors hover:text-foreground h-4 w-4 -mr-0.5"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setUIState({ detailsModelId: model.id });
              }}
              aria-label={infoLabel}
            />
          </div>
        </span>
      </div>
    </div>
  );
};
