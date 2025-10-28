import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { instructionsAtom } from "@/store/instructions";

export const useInstructions = () => useAtom(instructionsAtom);
export const useInstructionsValue = () => useAtomValue(instructionsAtom);
export const useInstructionsSetter = () => useSetAtom(instructionsAtom);
