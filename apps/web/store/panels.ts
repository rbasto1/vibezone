import type { ThreadMessageLike } from "@assistant-ui/react";
import { atom } from "jotai";

// Panel configuration atom
export interface PanelConfig {
  id: string;
  provider: string;
  model: string;
  initialMessages?: ThreadMessageLike[];
}

export const panelConfigAtom = atom<PanelConfig[]>([]);

// Panel state atom
export interface PanelState {
  running: boolean;
  hasMessages: boolean;
  error?: Error;
}

export const panelStateAtom = atom<Record<string, PanelState>>({});
