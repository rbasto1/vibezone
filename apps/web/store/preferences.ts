import type { ReasoningEffort } from "@/db";
import { atom } from "jotai";

export interface PreferencesAtom {
  webSearch: boolean;
  autoScroll: boolean;
  hiddenProviders: string[];
  reasoningEffort: ReasoningEffort;
  enterKeySends: boolean;
  shiftEnterKeySends: boolean;
  skipCloseThreadConfirmation: boolean;
  hideLegal: boolean;
  automaticMemoriesDisabled: boolean;
}

export const preferencesAtom = atom<PreferencesAtom>({
  webSearch: false,
  autoScroll: false,
  hiddenProviders: [],
  reasoningEffort: "low",
  enterKeySends: true,
  shiftEnterKeySends: false,
  skipCloseThreadConfirmation: false,
  hideLegal: false,
  automaticMemoriesDisabled: false,
});
