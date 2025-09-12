import type { GetModelsListReturn } from "@/lib/trpc/models";
import { atom } from "jotai";

// Always defined; hydrated at root layout but safe default here
export const modelsAtom = atom<GetModelsListReturn>({
  providers: [],
  models: [],
  groups: [],
});
