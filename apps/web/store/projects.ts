import { atom } from "jotai";

export interface ProjectConfig {
  id: string;
  name: string;
  color: string;
  instructions: string | null;
  chatCount: number;
  isDefault: boolean;
}

export const projectsAtom = atom<ProjectConfig[]>([]);
