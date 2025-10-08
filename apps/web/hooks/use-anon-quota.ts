"use client";

import { anonUsageStorageAtom, type AnonUsage } from "@/store/anon-quota";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

export const ANON_DAILY_LIMIT = 20;

export function today(): string {
  return new Date().toISOString().substring(0, 10);
}

function ensureToday(u: AnonUsage): number {
  const t = today();
  if (!u || typeof u.count !== "number" || !u.date || u.date !== t) {
    return 0;
  }
  return u.count;
}

function clampCount(count: number | null): number | null {
  if (count === null) return null;
  return Math.min(ANON_DAILY_LIMIT, Math.max(0, count));
}

export const useAnonQuotaValue = () => {
  const raw = useAtomValue(anonUsageStorageAtom);
  return ensureToday(raw);
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

export const useAnonRemaining = () => {
  const count = useAnonQuotaValue();
  return Math.max(0, ANON_DAILY_LIMIT - count);
};
