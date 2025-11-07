import type { ProjectConfig } from "@/store/projects";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

export type ModelPickerState =
  | {
      type: "suggestion";
    }
  | {
      type: "thread-change";
      panelId: string;
    }
  | {
      type: "thread-duplicate";
      panelId: string;
    };

export interface UIState {
  suggestionsUsed: boolean;
  panelOpen: "preferences" | "search" | null;
  detailsModelId?: string;
  deleteProject?: ProjectConfig;
  editProject?: ProjectConfig;
  createProject: boolean;
  focusPanelId?: string;
  modelPicker?: ModelPickerState | null;
}

// Global UI state atom
const uiStateAtom = atom<UIState>({
  suggestionsUsed: false,
  panelOpen: null,
  createProject: false,
  modelPicker: null,
});

export const useUIStateValue = () => {
  return useAtomValue(uiStateAtom);
};

export const useUIStateSetter = () => {
  const set = useSetAtom(uiStateAtom);
  return useCallback(
    (change: Partial<UIState> | ((s: UIState) => Partial<UIState>)) => {
      if (typeof change === "function") {
        set((s) => ({ ...s, ...change(s) }));
        return;
      }
      set((s) => ({ ...s, ...change }));
    },
    [set]
  );
};

export const useUIState = () => {
  return [useUIStateValue(), useUIStateSetter()] as const;
};
