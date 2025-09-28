"use client";

import { today } from "@/hooks/use-anon-quota";
import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

const ANON_STORAGE_KEY = "vz_anon_msg_usage";

export interface AnonUsage {
  date: string; // YYYY-MM-DD
  count: number | null;
}

export const defaultAnonUsage: AnonUsage = {
  date: today(),
  count: null,
};

// Bare storage-backed atom; hooks layer enforces business rules
export const anonUsageStorageAtom =
  typeof window !== "undefined"
    ? atomWithStorage<AnonUsage>(
        ANON_STORAGE_KEY,
        defaultAnonUsage,
        createJSONStorage(() => window.localStorage),
        { getOnInit: true }
      )
    : atom(defaultAnonUsage);
