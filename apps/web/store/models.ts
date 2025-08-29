"use client";

import { trpc } from "@/lib/trpc/client";
import type { ModelsListOutput } from "@/lib/trpc/server/server";
import { atom, useSetAtom } from "jotai";
import { useEffect } from "react";

// We keep the entire TRPC response in one atom for simplicity
export const modelsAtom = atom<ModelsListOutput>();

// A small hook to ensure the store is populated via TRPC
export function useEnsureModels() {
  const setModels = useSetAtom(modelsAtom);

  const query = trpc.models.list.useQuery(undefined, {
    staleTime: 1000 * 60 * 60,
  });
  const { data, isLoading, error } = query;

  useEffect(() => {
    if (!data) return;
    setModels(data);
  }, [data, setModels]);

  return { isLoading, error };
}
