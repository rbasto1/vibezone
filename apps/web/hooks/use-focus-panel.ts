import { useEffect } from "react";
import { useIsMobile } from "./use-mobile";
import { usePanelsConfigValue } from "./use-panels";
import { useUIState } from "./use-ui-state";

export const useFocusPanelIdValue = () => {
  const isMobile = useIsMobile();
  const [uiState, setUIState] = useUIState();
  const panelsConfig = usePanelsConfigValue();
  const focusPanelId = uiState.focusPanelId;

  useEffect(() => {
    if (isMobile) {
      setUIState(({ focusPanelId }) => {
        if (
          focusPanelId &&
          panelsConfig.some((panel) => panel.id === focusPanelId)
        ) {
          return { focusPanelId };
        }

        return { focusPanelId: panelsConfig[0]?.id };
      });
      return;
    }

    setUIState(({ focusPanelId }) => {
      if (!focusPanelId) return { focusPanelId: undefined };
      const exists = panelsConfig.some((panel) => panel.id === focusPanelId);
      if (!exists || panelsConfig.length <= 1) {
        return { focusPanelId: undefined };
      }
      return { focusPanelId };
    });
  }, [isMobile, panelsConfig, setUIState]);

  return focusPanelId;
};
