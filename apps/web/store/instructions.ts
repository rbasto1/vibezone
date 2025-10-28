import { atom } from "jotai";

export interface InstructionConfig {
  id: string;
  title: string;
  content: string;
  projectId: string | null;
  isActive: boolean;
  order: number;
}

export const instructionsAtom = atom<InstructionConfig[]>([]);
