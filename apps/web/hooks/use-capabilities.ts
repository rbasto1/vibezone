import { modelMap } from "@/lib/model-map";
import { usePanelsConfigValue } from "./use-panels";

export function canReason(id: string) {
  return !!modelMap.get(id)?.capReason;
}

export function useAllCanReason() {
  const panelsConfig = usePanelsConfigValue();
  return panelsConfig.every((panel) => canReason(panel.model));
}
