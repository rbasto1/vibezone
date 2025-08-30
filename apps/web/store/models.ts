import type { ModelsListOutput } from "@/lib/trpc/server/server";
import { atom } from "jotai";

// Always defined; hydrated at root layout but safe default here
export const modelsAtom = atom<ModelsListOutput>({ providers: [], models: [] });
