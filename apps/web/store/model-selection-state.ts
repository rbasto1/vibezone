import type { CapabilityOptionId } from "@/components/assistant-ui/model-selector/model-dropdown-constants";
import type { ProviderTier } from "@/db";
import { atom } from "jotai";

export interface ModelSelectionState {
  selectedTier: ProviderTier | null;
  selectedSuggestionGroup?: string;
  selectedCapabilities: Set<CapabilityOptionId>;
  showFavoritesOnly: boolean;
}

export const createDefaultModelSelectionState = (): ModelSelectionState => ({
  selectedTier: "leaders",
  selectedSuggestionGroup: undefined,
  selectedCapabilities: new Set<CapabilityOptionId>(),
  showFavoritesOnly: false,
});

export const modelSelectionStateAtom = atom<ModelSelectionState>(
  createDefaultModelSelectionState()
);
