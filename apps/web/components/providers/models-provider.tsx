"use client";

import type { GetModelsListReturn } from "@/lib/trpc/models";
import { modelsAtom } from "@/store/models";
import { Provider as JotaiProvider, createStore } from "jotai";
import { useMemo, type PropsWithChildren } from "react";

type ModelsProviderProps = PropsWithChildren<{
  initialValue: GetModelsListReturn;
}>;

export function ModelsProvider({
  initialValue,
  children,
}: ModelsProviderProps) {
  const store = useMemo(() => {
    const s = createStore();
    s.set(modelsAtom, initialValue);
    return s;
  }, [initialValue]);

  return <JotaiProvider store={store}>{children}</JotaiProvider>;
}
