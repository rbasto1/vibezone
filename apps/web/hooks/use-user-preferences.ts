import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { preferencesAtom } from "@/store/preferences";

export const useUserPreferences = () => {
  return useAtom(preferencesAtom);
};

export const useUserPreferencesSetter = () => {
  return useSetAtom(preferencesAtom);
};

export const useUserPreferencesValue = () => {
  return useAtomValue(preferencesAtom);
};
