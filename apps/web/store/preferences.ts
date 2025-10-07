import type { ReasoningEffort } from "@/db";
import { atom } from "jotai";

export interface PreferencesAtom {
  pluginWeb: boolean;
  systemPrompt: string | null;
  changedPrompt: boolean;
  autoScroll: boolean;
  hiddenProviders: string[];
  reasoningEffort: ReasoningEffort;
}

export const preferencesAtom = atom<PreferencesAtom>({
  pluginWeb: false,
  systemPrompt: null,
  changedPrompt: false,
  autoScroll: false,
  hiddenProviders: [],
  reasoningEffort: "low",
});
