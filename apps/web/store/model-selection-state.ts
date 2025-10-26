import type { ProviderTier } from "@/db";
import type {
  CapabilityOptionId,
  TierOptionId,
} from "@/components/assistant-ui/model-dropdown-constants";
import { atom } from "jotai";

export interface ModelSelectionState {
  selectedTier: ProviderTier | TierOptionId | null;
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
