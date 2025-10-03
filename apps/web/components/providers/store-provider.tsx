"use client";

import { Provider as JotaiProvider, getDefaultStore } from "jotai";
import { useMemo, type PropsWithChildren } from "react";

import { INITIAL_PANEL_COUNT } from "@/lib/constants";
import { generateChatId } from "@/lib/id";
import type { GetModelsListReturn } from "@/lib/trpc/models";
import { currentChatAtom } from "@/store/chat";
import { modelsAtom } from "@/store/models";
import type { PanelState } from "@/store/panels";
import {
  panelConfigAtom,
  panelStateAtom,
  type PanelConfig,
} from "@/store/panels";
import { preferencesAtom, type PreferencesAtom } from "@/store/preferences";

type ModelsProviderProps = PropsWithChildren<{
  modelsInitialValue: GetModelsListReturn;
  panelsInitialValue: PanelConfig[];
  preferencesInitialValue: PreferencesAtom;
}>;

export function StoreProvider({
  modelsInitialValue,
  panelsInitialValue,
  preferencesInitialValue,
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
          acc[p.id] = { running: false, dirty: false, hasMessages: false };
          return acc;
        },
        {} as Record<string, PanelState>
      )
    );
    s.set(preferencesAtom, preferencesInitialValue);

    // Initialize chat atom with a new chat ID
    s.set(currentChatAtom, {
      id: generateChatId(),
      createdAt: new Date(),
      addedToList: false,
      fetchedTitlePanelId: null,
    });

    return s;
  }, [modelsInitialValue, panelsInitialValue, preferencesInitialValue]);

  return <JotaiProvider store={store}>{children}</JotaiProvider>;
}
