"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { ANON_DAILY_LIMIT, getAnonRemaining } from "@/lib/anon-quota";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export function AnonQuotaBanner() {
  const session = useSession();
  const [remaining, setRemaining] = useState(getAnonRemaining());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "vz_anon_msg_usage") {
        setRemaining(getAnonRemaining());
      }
    };
    const onCustom = () => setRemaining(getAnonRemaining());
    window.addEventListener("storage", onStorage);
    window.addEventListener("vz:anon-quota", onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("vz:anon-quota", onCustom);
    };
  }, []);

  if (session?.user) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border p-2.5 text-sm border-amber-300 dark:border-amber-500/40 dark:text-amber-200 bg-amber-200 text-amber-900 dark:bg-amber-500/40">
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="h-4 w-4 ml-2 text-amber-900 dark:text-amber-300"
          aria-hidden="true"
        />
        <span>
          {ANON_DAILY_LIMIT} free messages/day — {remaining} remaining
        </span>
      </div>
      <Button
        size="sm"
        className={
          "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-black transition-all duration-1000 vz-glow-pulse"
        }
        onClick={() => {
          try {
            window.dispatchEvent(new Event("vz:open-login"));
          } catch {
            /* ignore */
          }
        }}
      >
        Log in to unlock more
      </Button>
    </div>
  );
}
