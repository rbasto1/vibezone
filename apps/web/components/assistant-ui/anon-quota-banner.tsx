"use client";

import { Button } from "@/components/ui/button";
import { ANON_DAILY_LIMIT, useAnonRemaining } from "@/hooks/use-anon-quota";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export function AnonQuotaBanner() {
  const t = useTranslations("AnonQuota");
  const setUIState = useUIStateSetter();
  const remaining = useAnonRemaining() ?? "";
  const mobileLabel = t("mobileBanner", {
    remaining,
    limit: ANON_DAILY_LIMIT,
  });
  const desktopLabel = t("desktopBanner", {
    remaining,
    limit: ANON_DAILY_LIMIT,
  });

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-2 text-xs leading-tight border-amber-300 dark:border-amber-500/40 dark:text-amber-200 bg-amber-200 text-amber-900 dark:bg-amber-500/40 md:flex-row md:items-center md:justify-between md:gap-4 md:p-2.5 md:text-sm md:leading-normal">
      <div className="flex items-start gap-1.5">
        <AlertTriangle
          className="hidden md:block h-4 w-4 text-amber-900 dark:text-amber-300"
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <span className="block md:hidden">{mobileLabel}</span>
          <span className="hidden md:block">{desktopLabel}</span>
        </div>
      </div>
      <Button
        size="sm"
        className={
          "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-black transition-all duration-1000 vz-glow-pulse w-full md:w-auto"
        }
        onClick={() => setUIState({ loginOpen: true })}
      >
        {t("signInCta")}
      </Button>
    </div>
  );
}
