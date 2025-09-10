"use client";

import { INITIAL_PANEL_COUNT } from "@/lib/constants";
import { generatePanelId } from "@/lib/id";
import type { GetModelsListReturn } from "@/lib/trpc/models";
import { currentChatAtom } from "@/store/chat";
import { modelsAtom } from "@/store/models";
import type { PanelState } from "@/store/panels";
import {
  panelConfigAtom,
  panelStateAtom,
  type PanelConfig,
} from "@/store/panels";
import { Provider as JotaiProvider, getDefaultStore } from "jotai";
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
    const s = getDefaultStore();
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

    // Initialize chat atom with a new chat ID
    s.set(currentChatAtom, {
      id: generatePanelId(),
      createdAt: new Date(),
    });

    return s;
  }, [modelsInitialValue, panelsInitialValue]);

  return <JotaiProvider store={store}>{children}</JotaiProvider>;
}
