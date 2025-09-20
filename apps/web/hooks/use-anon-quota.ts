import {
  ANON_DAILY_LIMIT,
  anonUsageStorageAtom,
  defaultAnonUsage,
  today,
  type AnonUsage,
} from "@/store/anon-quota";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";

function ensureToday(u: AnonUsage): AnonUsage {
  const t = today();
  if (!u || typeof u.count !== "number" || !u.date)
    return { date: t, count: 0 };
  if (u.date !== t) return { date: t, count: 0 };
  return u;
}

function clampCount(count: number): number {
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
    (
      update:
        | AnonUsage
        | ((prev: AnonUsage) => AnonUsage)
        | ((prev: AnonUsage) => Partial<AnonUsage>)
    ) => {
      set((prev) => {
        const base = ensureToday(prev ?? defaultAnonUsage());
        const next = typeof update === "function" ? update(base) : update;
        const merged: AnonUsage = {
          date: today(),
          count: clampCount("count" in next ? (next.count ?? 0) : base.count),
        };
        return merged;
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
  return Math.max(0, ANON_DAILY_LIMIT - count);
};
