"use client";

import { cn } from "@/components/ui/utils";
import { useTranslations } from "next-intl";

interface PremiumTagProps {
  className?: string;
}

export const PremiumTag: React.FC<PremiumTagProps> = ({ className }) => {
  const t = useTranslations("AssistantTags");

  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300",
        className
      )}
    >
      {t("premium")}
    </span>
  );
};
