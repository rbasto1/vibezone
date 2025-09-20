"use client";

import { Button } from "@/components/ui/button";
import { useAnonRemaining } from "@/hooks/use-anon-quota";
import { useSession } from "@/hooks/use-session";
import { ANON_DAILY_LIMIT } from "@/store/anon-quota";
import { AlertTriangle } from "lucide-react";

export function AnonQuotaBanner() {
  const session = useSession();
  const remaining = useAnonRemaining();

  if (session?.user) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-2 text-xs leading-tight border-amber-300 dark:border-amber-500/40 dark:text-amber-200 bg-amber-200 text-amber-900 dark:bg-amber-500/40 md:flex-row md:items-center md:justify-between md:gap-4 md:p-2.5 md:text-sm md:leading-normal">
      <div className="flex items-start gap-1.5">
        <AlertTriangle
          className="hidden md:block h-4 w-4 text-amber-900 dark:text-amber-300"
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <span className="block md:hidden" suppressHydrationWarning>
            {remaining} of {ANON_DAILY_LIMIT} free messages remaining
          </span>
          <span className="hidden md:block" suppressHydrationWarning>
            {ANON_DAILY_LIMIT} free messages/day — {remaining} remaining
          </span>
        </div>
      </div>
      <Button
        size="sm"
        className={
          "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-black transition-all duration-1000 vz-glow-pulse w-full md:w-auto"
        }
        onClick={() => {
          try {
            window.dispatchEvent(new Event("vz:open-login"));
          } catch {
            /* ignore */
          }
        }}
      >
        Sign in to unlock more
      </Button>
    </div>
  );
}
