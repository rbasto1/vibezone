import type { UIState } from "@/store/panels";
import { uiStateAtom } from "@/store/panels";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

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
