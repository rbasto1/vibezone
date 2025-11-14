import { atom } from "jotai";

export interface ProjectConfig {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  automaticMemoriesDisabled: boolean;
}

export const projectsAtom = atom<ProjectConfig[]>([]);
