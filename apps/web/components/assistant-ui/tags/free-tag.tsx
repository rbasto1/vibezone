"use client";

import { cn } from "@/components/ui/utils";
import { useTranslations } from "next-intl";

interface FreeTagProps {
  className?: string;
}

export const FreeTag: React.FC<FreeTagProps> = ({ className }) => {
  const t = useTranslations("AssistantTags");

  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-800 dark:text-green-300",
        className
      )}
    >
      {t("free")}
    </span>
  );
};
