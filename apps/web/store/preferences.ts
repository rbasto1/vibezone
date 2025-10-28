import type { ReasoningEffort } from "@/db";
import { atom } from "jotai";

export interface PreferencesAtom {
  pluginWeb: boolean;
  autoScroll: boolean;
  hiddenProviders: string[];
  reasoningEffort: ReasoningEffort;
  skipCloseThreadConfirmation: boolean;
  hideLegal: boolean;
}

export const preferencesAtom = atom<PreferencesAtom>({
  pluginWeb: false,
  autoScroll: false,
  hiddenProviders: [],
  reasoningEffort: "low",
  skipCloseThreadConfirmation: false,
  hideLegal: false,
});
