"use client";

import { cn } from "@/components/ui/utils";
import { useTranslations } from "next-intl";

interface NewTagProps {
  className?: string;
}

export const NewTag: React.FC<NewTagProps> = ({ className }) => {
  const t = useTranslations("AssistantTags");

  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-800 dark:text-blue-300",
        className
      )}
    >
      {t("new")}
    </span>
  );
};
