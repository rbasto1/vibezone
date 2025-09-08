import {
  panelConfigAtom,
  panelStateAtom,
  type PanelConfig,
  type PanelState,
} from "@/store/panels";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

// Value hooks - read-only access
export const usePanelConfigValue = () => {
  const panelConfigs = useAtomValue(panelConfigAtom);
  return useCallback(
    (panelId: string) => {
      return panelConfigs.find((panel) => panel.id === panelId);
    },
    [panelConfigs]
  );
};

export const usePanelsConfigValue = () => {
  return useAtomValue(panelConfigAtom);
};

export const usePanelStateValue = () => {
  const panelStates = useAtomValue(panelStateAtom);
  return useCallback(
    (panelId: string) => {
      return panelStates[panelId] || { running: false };
    },
    [panelStates]
  );
};

export const usePanelsStateValue = () => {
  return useAtomValue(panelStateAtom);
};

// Setter hooks - write-only access
export const usePanelConfigSetter = () => {
  const setPanelConfigs = useSetAtom(panelConfigAtom);

  return useCallback(
    (panelId: string, updater: (currentPanel: PanelConfig) => PanelConfig) => {
      setPanelConfigs((panels) =>
        panels.map((panel) => (panel.id === panelId ? updater(panel) : panel))
      );
    },
    [setPanelConfigs]
  );
};

export const usePanelStateSetter = () => {
  const setPanelState = useSetAtom(panelStateAtom);

  return useCallback(
    (panelId: string, updater: (currentState: PanelState) => PanelState) => {
      setPanelState((panelState) => ({
        ...panelState,
        [panelId]: updater(panelState[panelId] || { running: false }),
      }));
    },
    [setPanelState]
  );
};

export const usePanelsConfigSetter = () => {
  const setPanelsConfig = useSetAtom(panelConfigAtom);
  return useCallback(
    (updater: (currentPanels: PanelConfig[]) => PanelConfig[]) => {
      setPanelsConfig(updater);
    },
    [setPanelsConfig]
  );
};

export const usePanelsStateSetter = () => {
  const setPanelsState = useSetAtom(panelStateAtom);
  return useCallback(
    (
      updater: (
        currentState: Record<string, PanelState>
      ) => Record<string, PanelState>
    ) => {
      setPanelsState(updater);
    },
    [setPanelsState]
  );
};

// Combined hooks - read and write access
export const usePanelsConfig = () => {
  return useAtom(panelConfigAtom);
};

export const usePanelsState = () => {
  return useAtom(panelStateAtom);
};

export const usePanelState = () => {
  const getter = usePanelStateValue();
  const setter = usePanelStateSetter();
  return [getter, setter] as const;
};
