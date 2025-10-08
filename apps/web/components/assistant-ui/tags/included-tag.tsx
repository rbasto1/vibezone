"use client";

import { cn } from "@/components/ui/utils";
import { useTranslations } from "next-intl";

interface IncludedTagProps {
  className?: string;
}

export const IncludedTag: React.FC<IncludedTagProps> = ({ className }) => {
  const t = useTranslations("AssistantTags");

  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-800 dark:text-cyan-300",
        className
      )}
      title={t("includedTooltip")}
    >
      {t("included")}
    </span>
  );
};
