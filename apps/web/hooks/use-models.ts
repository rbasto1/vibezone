import type { GetModelsListReturn } from "@/lib/trpc/models";
import { modelsAtom } from "@/store/models";
import { useAtom, useAtomValue } from "jotai";

/**
 * Hook that returns both the models value and a setter function
 * @returns [models, setModels] - tuple with current models state and setter
 */
export function useModels(): [
  GetModelsListReturn,
  (value: GetModelsListReturn) => void,
] {
  return useAtom(modelsAtom);
}

/**
 * Hook that returns only the current models value (read-only)
 * @returns models - current models state
 */
export function useModelsValue(): GetModelsListReturn {
  return useAtomValue(modelsAtom);
}
