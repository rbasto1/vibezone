import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { projectsAtom } from "@/store/projects";

export const useProjects = () => useAtom(projectsAtom);
export const useProjectsValue = () => useAtomValue(projectsAtom);
export const useProjectsSetter = () => useSetAtom(projectsAtom);
