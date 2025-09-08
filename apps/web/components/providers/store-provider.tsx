"use client";

import { INITIAL_PANEL_COUNT } from "@/lib/constants";
import type { GetModelsListReturn } from "@/lib/trpc/models";
import { modelsAtom } from "@/store/models";
import type { PanelState } from "@/store/panels";
import {
  panelConfigAtom,
  panelStateAtom,
  type PanelConfig,
} from "@/store/panels";
import { Provider as JotaiProvider, createStore } from "jotai";
import { useMemo, type PropsWithChildren } from "react";

type ModelsProviderProps = PropsWithChildren<{
  modelsInitialValue: GetModelsListReturn;
  panelsInitialValue: PanelConfig[];
}>;

export function StoreProvider({
  modelsInitialValue,
  panelsInitialValue,
  children,
}: ModelsProviderProps) {
  const store = useMemo(() => {
    const s = createStore();
    s.set(modelsAtom, modelsInitialValue);
    s.set(panelConfigAtom, panelsInitialValue);
    s.set(
      panelStateAtom,
      panelsInitialValue.slice(0, INITIAL_PANEL_COUNT).reduce(
        (acc, p) => {
          acc[p.id] = { running: false };
          return acc;
        },
        {} as Record<string, PanelState>
      )
    );

    return s;
  }, [modelsInitialValue, panelsInitialValue]);

  return <JotaiProvider store={store}>{children}</JotaiProvider>;
}
