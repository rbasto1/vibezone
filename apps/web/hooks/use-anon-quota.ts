"use client";

import { anonUsageStorageAtom, type AnonUsage } from "@/store/anon-quota";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";

export const ANON_DAILY_LIMIT = 20;

export function today(): string {
  return new Date().toISOString().substring(0, 10);
}

function ensureToday(u: AnonUsage): AnonUsage {
  const t = today();
  if (!u || typeof u.count !== "number" || !u.date)
    return { date: t, count: 0 };
  if (u.date !== t) return { date: t, count: 0 };
  return u;
}

function clampCount(count: number | null): number | null {
  if (count === null) return null;
  return Math.min(ANON_DAILY_LIMIT, Math.max(0, count));
}

export const useAnonQuotaValue = () => {
  const raw = useAtomValue(anonUsageStorageAtom);
  const normalized = useMemo(() => ensureToday(raw), [raw]);
  return normalized;
};

export const useAnonQuotaSetter = () => {
  const set = useSetAtom(anonUsageStorageAtom);
  return useCallback(
    (remaining: number) => {
      const count = ANON_DAILY_LIMIT - remaining;
      set((prev) => {
        const next = {
          date: today(),
          count: clampCount(Math.max(count, prev.count ?? 0)),
        };
        return next;
      });
    },
    [set]
  );
};

export const useSetDepleted = () => {
  const set = useSetAtom(anonUsageStorageAtom);
  return useCallback(() => {
    set({ date: today(), count: ANON_DAILY_LIMIT });
  }, [set]);
};

export const useAnonQuota = () => {
  const value = useAnonQuotaValue();
  const set = useAnonQuotaSetter();
  return [value, set] as const;
};

export const useAnonRemaining = () => {
  const { count } = useAnonQuotaValue();
  if (count === null) return null;
  return Math.max(0, ANON_DAILY_LIMIT - count);
};
