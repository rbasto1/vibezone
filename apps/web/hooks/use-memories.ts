import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { memoriesAtom } from "@/store/memories";

export const useMemories = () => useAtom(memoriesAtom);
export const useMemoriesValue = () => useAtomValue(memoriesAtom);
export const useMemoriesSetter = () => useSetAtom(memoriesAtom);
