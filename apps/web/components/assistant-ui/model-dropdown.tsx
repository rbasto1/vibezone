"use client";

import { useModelFavorites } from "@/hooks/use-model-favorites";
import { useModelsValue } from "@/hooks/use-models";
import { useOpenSignIn } from "@/lib/auth-client";
import {
  ArrowUpRightIcon,
  CircleStopIcon,
  CopyIcon,
  MoreVerticalIcon,
  SparklesIcon,
  StarIcon,
  StarOffIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ProviderIcon } from "../ui/providers/provider";
import { cn } from "../ui/utils";

interface ModelDropdownProps {
  modelId: string;
  className?: string;
  isRunning: boolean;
  isProcessing?: boolean;
  canDiscard: boolean;
  onStop?: () => void;
  onOpenModelPicker: () => void;
  onMoveThread: () => void;
  onDuplicateThread: () => void;
  onDiscardThread: () => void;
  stopLabel: string;
}

export const ModelDropdown: FC<ModelDropdownProps> = ({
  modelId,
  className,
  isRunning,
  isProcessing = false,
  onStop,
  onOpenModelPicker,
  onMoveThread,
  onDuplicateThread,
  onDiscardThread,
  stopLabel,
  canDiscard,
}) => {
  const t = useTranslations("ResponsePanelHeader");
  const includeModels = [modelId];
  const { models, providers } = useModelsValue({ includeModels });
  const { isFavorite, toggleFavorite, user, isToggling } = useModelFavorites();
  const openSignIn = useOpenSignIn();
  const model = models.find((item) => item.id === modelId) ?? {
    id: modelId,
    name: modelId,
    providerId: modelId.split("/")[0] ?? "",
  };
  const provider = providers.find((item) => item.id === model.providerId);

  const favorite = Boolean(user) && isFavorite(modelId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          disabled={isProcessing}
          title={t("menuLabel")}
          className={cn(
            "inline-flex h-8 items-center gap-2 truncate border-border bg-muted text-sm font-medium text-foreground transition-colors hover:bg-muted-foreground/10",
            (isProcessing || isRunning) && "opacity-60",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            {provider && <ProviderIcon providerId={provider.id} />}
            <span className="truncate">{model.name ?? modelId}</span>
          </span>
          <span className="flex items-center gap-1">
            {favorite && (
              <StarIcon
                className="h-4 w-4 text-yellow-500"
                fill="currentColor"
              />
            )}
            {isRunning && onStop ? (
              <span
                role="button"
                tabIndex={-1}
                className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-destructive/10"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onStop();
                }}
                aria-label={stopLabel}
                title={stopLabel}
              >
                <CircleStopIcon className="h-4 w-4 text-destructive" />
              </span>
            ) : (
              <MoreVerticalIcon className="h-4 w-4" />
            )}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-70">
        <DropdownMenuItem onSelect={onOpenModelPicker}>
          <SparklesIcon className="mr-2 h-4 w-4" />
          {t("menuChangeModel")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            if (isToggling) {
              event.preventDefault();
              return;
            }
            if (!user) {
              event.preventDefault();
              openSignIn();
              return;
            }
            toggleFavorite(modelId);
          }}
          disabled={isToggling}
        >
          {favorite ? (
            <StarOffIcon className="mr-2 h-4 w-4" />
          ) : (
            <StarIcon className="mr-2 h-4 w-4" />
          )}
          {favorite ? t("menuUnfavorite") : t("menuFavorite")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canDiscard}
          title={!canDiscard ? t("closeDisabledTooltip") : undefined}
          onSelect={onMoveThread}
        >
          <ArrowUpRightIcon className="mr-2 h-4 w-4" />
          {t("menuMoveThread")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicateThread}>
          <CopyIcon className="mr-2 h-4 w-4" />
          {t("menuDuplicateThread")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={!canDiscard}
          title={!canDiscard ? t("closeDisabledTooltip") : undefined}
          onSelect={onDiscardThread}
        >
          <Trash2Icon className="mr-2 h-4 w-4" />
          {t("menuDiscardThread")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
