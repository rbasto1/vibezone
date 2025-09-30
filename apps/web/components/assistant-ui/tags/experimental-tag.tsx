"use client";

import { cn } from "@/components/ui/utils";
import { useTranslations } from "next-intl";

interface ExperimentalTagProps {
  className?: string;
}

export const ExperimentalTag: React.FC<ExperimentalTagProps> = ({ className }) => {
  const t = useTranslations("AssistantTags");

  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300",
        className
      )}
    >
      {t("experimental")}
    </span>
  );
};
