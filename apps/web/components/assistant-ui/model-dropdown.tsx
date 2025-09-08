"use client";

import { useModelsValue } from "@/hooks/use-models";
import { usePanelsConfigSetter } from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { ChevronDown } from "lucide-react";
import { useState, type FC } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ProviderIcon } from "../ui/providers/provider";
import { ModelDropdownContents } from "./model-dropdown-contents";

interface ModelDropdownProps {
  panelId: string;
  modelId: string;
}

export const ModelDropdown: FC<ModelDropdownProps> = ({ modelId, panelId }) => {
  const { providers, models } = useModelsValue();
  const model = models.find((m) => m.id === modelId);
  const provider = providers.find((p) => p.id === model?.providerId);
  const [isOpen, setIsOpen] = useState(false);

  const setPanelsConfig = usePanelsConfigSetter();
  const saveLastModels = useSaveLastModels();

  const handleChangePanelModel = (providerId: string, modelId: string) => {
    setPanelsConfig((panelsConfig) => {
      const newPanels = panelsConfig.map((p) =>
        p.id === panelId ? { ...p, provider: providerId, model: modelId } : p
      );
      saveLastModels(newPanels);
      return newPanels;
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button title="Change model" variant="outline">
          <span className="flex items-center gap-2 truncate max-w-[20vw]">
            {provider && <ProviderIcon providerId={provider.id} />}
            <span className="truncate">{model?.name ?? modelId}</span>
            <ChevronDown className="h-4 w-4 ml-4" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        {isOpen && (
          <ModelDropdownContents
            onSelect={handleChangePanelModel}
            currentModelId={modelId}
          />
        )}
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
