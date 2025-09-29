import {
  panelConfigAtom,
  panelStateAtom,
  type PanelConfig,
  type PanelState,
} from "@/store/panels";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

// Value hooks - read-only access
export const usePanelConfigValue = (id: string) => {
  const panelConfigs = useAtomValue(panelConfigAtom);
  return panelConfigs.find((panel) => panel.id === id);
};

export const usePanelsConfigValue = () => {
  return useAtomValue(panelConfigAtom);
};

export const usePanelStateValue = (id: string) => {
  const panelStates = useAtomValue(panelStateAtom);
  return (
    panelStates[id] || { running: false, dirty: false, hasMessages: false }
  );
};

export const usePanelsStateValue = () => {
  return useAtomValue(panelStateAtom);
};

// Setter hooks - write-only access
export const usePanelConfigSetter = (id: string) => {
  const setPanelConfigs = useSetAtom(panelConfigAtom);

  return useCallback(
    (updater: PanelConfig | ((currentPanel: PanelConfig) => PanelConfig)) => {
      setPanelConfigs((panels) =>
        panels.map((panel) =>
          panel.id === id
            ? typeof updater === "function"
              ? updater(panel)
              : updater
            : panel
        )
      );
    },
    [setPanelConfigs, id]
  );
};

export const usePanelStateSetter = (id: string) => {
  const setPanelState = useSetAtom(panelStateAtom);

  return useCallback(
    (updater: PanelState | ((currentState: PanelState) => PanelState)) => {
      setPanelState((panelState) => ({
        ...panelState,
        [id]:
          typeof updater === "function"
            ? updater(
                panelState[id] || {
                  running: false,
                  dirty: false,
                  hasMessages: false,
                }
              )
            : updater,
      }));
    },
    [setPanelState, id]
  );
};

export const usePanelsConfigSetter = () => {
  const setPanelsConfig = useSetAtom(panelConfigAtom);
  return useCallback(
    (
      updater: PanelConfig[] | ((currentPanels: PanelConfig[]) => PanelConfig[])
    ) => {
      setPanelsConfig(updater);
    },
    [setPanelsConfig]
  );
};

export const usePanelsStateSetter = () => {
  const setPanelsState = useSetAtom(panelStateAtom);
  return useCallback(
    (
      updater:
        | Record<string, PanelState>
        | ((
            currentState: Record<string, PanelState>
          ) => Record<string, PanelState>)
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

export const usePanelState = (id: string) => {
  const value = usePanelStateValue(id);
  const setter = usePanelStateSetter(id);
  return [value, setter] as const;
};

export const usePanelConfig = (id: string) => {
  const value = usePanelConfigValue(id);
  const setter = usePanelConfigSetter(id);
  return [value, setter] as const;
};
