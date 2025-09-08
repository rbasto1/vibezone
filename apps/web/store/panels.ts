import { atom } from "jotai";

// Panel configuration atom
export interface PanelConfig {
  id: string;
  provider: string;
  model: string;
}

export const panelConfigAtom = atom<PanelConfig[]>([]);

// Panel state atom
export interface PanelState {
  running: boolean;
  error?: Error;
}

export const panelStateAtom = atom<Record<string, PanelState>>({});
