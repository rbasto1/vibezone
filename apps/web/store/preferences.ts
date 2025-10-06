import type { reasoningEffort } from "@/db/enums";
import { atom } from "jotai";

export interface PreferencesAtom {
  pluginWeb: boolean;
  systemPrompt: string | null;
  changedPrompt: boolean;
  autoScroll: boolean;
  hiddenProviders: string[];
  reasoningEffort: (typeof reasoningEffort.enumValues)[number];
}

export const preferencesAtom = atom<PreferencesAtom>({
  pluginWeb: false,
  systemPrompt: null,
  changedPrompt: false,
  autoScroll: false,
  hiddenProviders: [],
  reasoningEffort: "low",
});
