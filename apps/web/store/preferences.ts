import { atom } from "jotai";

export interface PreferencesAtom {
  pluginWeb: boolean;
  systemPrompt: string | null;
}

export const preferencesAtom = atom<PreferencesAtom>({
  pluginWeb: false,
  systemPrompt: null,
});
