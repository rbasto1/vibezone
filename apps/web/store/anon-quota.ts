"use client";

import { atomWithStorage, createJSONStorage } from "jotai/utils";

export const ANON_STORAGE_KEY = "vz_anon_msg_usage";
export const ANON_DAILY_LIMIT = 20;

export type AnonUsage = {
  date: string; // YYYY-MM-DD
  count: number;
};

export function today(): string {
  return new Date().toISOString().substring(0, 10);
}

export const defaultAnonUsage = (): AnonUsage => ({ date: today(), count: 0 });

// Bare storage-backed atom; hooks layer enforces business rules
export const anonUsageStorageAtom = atomWithStorage<AnonUsage>(
  ANON_STORAGE_KEY,
  defaultAnonUsage(),
  createJSONStorage<AnonUsage>(() => localStorage),
  { getOnInit: true }
);
