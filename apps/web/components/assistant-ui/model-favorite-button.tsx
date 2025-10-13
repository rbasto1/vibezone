"use client";

import { cn } from "@/components/ui/utils";
import { useModelFavorites } from "@/hooks/use-model-favorites";
import { useOpenSignIn } from "@/lib/auth-client";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, type MouseEvent } from "react";

interface ModelFavoriteButtonProps {
  modelId: string;
  className?: string;
  size?: "sm" | "md";
}

export const ModelFavoriteButton: React.FC<ModelFavoriteButtonProps> = ({
  modelId,
  className,
  size = "sm",
}) => {
  const { isFavorite, toggleFavorite, isToggling, user } = useModelFavorites();
  const openSignIn = useOpenSignIn();
  const t = useTranslations("ModelDropdown");

  const favorite = user ? isFavorite(modelId) : false;
  const label = favorite ? t("favoriteRemove") : t("favoriteAdd");

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!user) {
        openSignIn();
        return;
      }
      toggleFavorite(modelId);
    },
    [modelId, toggleFavorite, user, openSignIn]
  );

  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center rounded-md transition-colors cursor-pointer",
        size === "md" ? "h-8 w-8" : "h-6 w-6",
        favorite
          ? "text-yellow-500 hover:text-yellow-500 hover:bg-yellow-500/15"
          : "text-muted-foreground hover:text-foreground hover:bg-foreground/10",
        className
      )}
      aria-label={label}
      title={label}
      onClick={handleClick}
      disabled={Boolean(user) && isToggling}
      aria-pressed={favorite}
    >
      <Star
        className={cn(
          "h-4 w-4 transition-colors",
          favorite ? "fill-current" : "fill-transparent"
        )}
      />
    </button>
  );
};
