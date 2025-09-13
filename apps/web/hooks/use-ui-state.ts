import { uiStateAtom } from "@/store/panels";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

export const useUIStateValue = () => {
  return useAtomValue(uiStateAtom);
};

export const useUIStateSetter = () => {
  return useSetAtom(uiStateAtom);
};

export const useUIState = () => {
  return useAtom(uiStateAtom);
};
