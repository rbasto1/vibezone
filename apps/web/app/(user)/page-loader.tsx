"use client";

import { InlineSpinner } from "@/components/ui/inline-spinner";
import { cn } from "@/components/ui/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FC } from "react";

export const PageLoader: FC = () => {
  const t = useTranslations("PageLoader");
  const [tooLong, setTooLong] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTooLong(true);
    }, 1500);
    return () => clearTimeout(timeout);
  }, []);

  if (tooLong) {
    return (
      <div
        className={cn(
          "fixed inset-0 flex items-center justify-center",
          "bg-background/80 backdrop-blur-sm",
          "z-50"
        )}
      >
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3",
            "text-muted-foreground"
          )}
        >
          <InlineSpinner />
          <p className="text-sm font-medium">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return <div />;
};
