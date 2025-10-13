import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

export interface UIState {
  suggestionsUsed: boolean;
  panelOpen: "preferences" | "search" | null;
  detailsModelId?: string;
}

// Global UI state atom
const uiStateAtom = atom<UIState>({
  suggestionsUsed: false,
  panelOpen: null,
});

export const useUIStateValue = () => {
  return useAtomValue(uiStateAtom);
};

export const useUIStateSetter = () => {
  const set = useSetAtom(uiStateAtom);
  return useCallback(
    (change: Partial<UIState>) => {
      set((s) => ({ ...s, ...change }));
    },
    [set]
  );
};

export const useUIState = () => {
  return [useUIStateValue(), useUIStateSetter()] as const;
};
