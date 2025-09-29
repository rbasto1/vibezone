import { ANON_DAILY_LIMIT, useAnonRemaining } from "@/hooks/use-anon-quota";

export const AnonMobileQuotaLabel = () => {
  const remaining = useAnonRemaining();
  const remainingLabel = `${remaining} of ${ANON_DAILY_LIMIT}`;

  return (
    <div className="md:hidden overflow-hidden rounded-full border border-amber-300 bg-amber-200 text-amber-900 text-xs font-semibold tracking-tight transition-all duration-800 ease-out whitespace-nowrap max-w-[96px] px-2 py-1 opacity-100 ml-2">
      {remainingLabel}
    </div>
  );
};
