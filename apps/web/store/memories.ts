import { atom } from "jotai";

export interface MemoryConfig {
  id: string;
  title: string;
  content: string;
  projectId: string;
  isActive: boolean;
  createdAt: string;
}

export const memoriesAtom = atom<MemoryConfig[]>([]);
