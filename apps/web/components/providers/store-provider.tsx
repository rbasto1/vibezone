"use client";

import { Provider as JotaiProvider, getDefaultStore } from "jotai";
import { useMemo, type PropsWithChildren } from "react";

import { INITIAL_PANEL_COUNT } from "@/lib/constants";
import { generateChatId } from "@/lib/id";
import type { GetModelsListReturn } from "@/lib/trpc/models";
import { currentChatAtom } from "@/store/chat";
import { instructionsAtom, type InstructionConfig } from "@/store/instructions";
import type { PanelState } from "@/store/panels";
import {
  panelConfigAtom,
  panelStateAtom,
  type PanelConfig,
} from "@/store/panels";
import { preferencesAtom, type PreferencesAtom } from "@/store/preferences";
import { projectsAtom, type ProjectConfig } from "@/store/projects";

type ModelsProviderProps = PropsWithChildren<{
  modelsInitialValue: GetModelsListReturn;
  panelsInitialValue: PanelConfig[];
  preferencesInitialValue: PreferencesAtom;
  projectsInitialValue: ProjectConfig[];
  instructionsInitialValue: InstructionConfig[];
}>;

export function StoreProvider({
  panelsInitialValue,
  preferencesInitialValue,
  projectsInitialValue,
  instructionsInitialValue,
  children,
}: ModelsProviderProps) {
  const store = useMemo(() => {
    const s = getDefaultStore();
    s.set(panelConfigAtom, panelsInitialValue);
    s.set(
      panelStateAtom,
      panelsInitialValue.slice(0, INITIAL_PANEL_COUNT).reduce(
        (acc, p) => {
          acc[p.id] = { running: false, hasMessages: false };
          return acc;
        },
        {} as Record<string, PanelState>
      )
    );
    s.set(preferencesAtom, preferencesInitialValue);
    s.set(projectsAtom, projectsInitialValue);
    s.set(instructionsAtom, instructionsInitialValue);

    // Initialize chat atom with a new chat ID
    const defaultProjectId =
      projectsInitialValue.find((project) => project.isDefault)?.id ?? null;
    s.set(currentChatAtom, {
      id: generateChatId(),
      createdAt: new Date(),
      addedToList: false,
      projectId: defaultProjectId,
    });

    return s;
  }, [
    panelsInitialValue,
    preferencesInitialValue,
    projectsInitialValue,
    instructionsInitialValue,
  ]);

  return <JotaiProvider store={store}>{children}</JotaiProvider>;
}
