import type { UIMessage } from "ai";
import { atom } from "jotai";

// Panel configuration atom
export interface PanelConfig {
  id: string;
  provider: string;
  model: string;
  initialMessages?: UIMessage[];
}

export interface UIState {
  suggestionsUsed: boolean;
  loginOpen: boolean;
  preferencesOpen: boolean;
}

export const panelConfigAtom = atom<PanelConfig[]>([]);

// Panel state atom
export interface PanelState {
  running: boolean;
  dirty: boolean; // whether the panel has unsaved changes
  hasMessages: boolean;
  error?: Error;
}

export const panelStateAtom = atom<Record<string, PanelState>>({});

// Global UI state atom
export const uiStateAtom = atom<UIState>({
  suggestionsUsed: false,
  loginOpen: false,
  preferencesOpen: false,
});
