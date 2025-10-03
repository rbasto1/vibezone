import { atom } from "jotai";

export interface PreferencesAtom {
  pluginWeb: boolean;
  systemPrompt: string | null;
  autoScroll: boolean;
  hiddenProviders: string[];
}

export const preferencesAtom = atom<PreferencesAtom>({
  pluginWeb: false,
  systemPrompt: null,
  autoScroll: false,
  hiddenProviders: [],
});
