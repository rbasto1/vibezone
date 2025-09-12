import type { GetModelsListReturn } from "@/lib/trpc/models";
import { modelsAtom } from "@/store/models";
import { useAtomValue } from "jotai";

/**
 * Hook that returns only the current models value (read-only)
 * @returns models - current models state
 */
export function useModelsValue(): GetModelsListReturn {
  return useAtomValue(modelsAtom);
}
