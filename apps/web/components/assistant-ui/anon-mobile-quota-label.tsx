"use client";

import { ANON_DAILY_LIMIT, useAnonRemaining } from "@/hooks/use-anon-quota";
import { useTranslations } from "next-intl";

export const AnonMobileQuotaLabel = () => {
  const t = useTranslations("AnonQuota");
  const remaining = useAnonRemaining() ?? "";
  const remainingLabel = t("mobileChip", {
    remaining,
    limit: ANON_DAILY_LIMIT,
  });

  return (
    <div className="md:hidden overflow-hidden rounded-full border border-amber-300 bg-amber-200 text-amber-900 text-xs font-semibold tracking-tight transition-all duration-800 ease-out whitespace-nowrap max-w-[96px] px-2 py-1 opacity-100 ml-2">
      {remainingLabel}
    </div>
  );
};
