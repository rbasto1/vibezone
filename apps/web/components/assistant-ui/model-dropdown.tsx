"use client";

import { useIsMobile } from "@/hooks/use-mobile";
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
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { cn } from "../ui/utils";
import { ModelDropdownContents } from "./model-dropdown-contents";
import { FreeTag } from "./tags";

interface ModelDropdownProps {
  panelId: string;
  modelId: string;
  className?: string;
}

export const ModelDropdown: FC<ModelDropdownProps> = ({
  modelId,
  panelId,
  className,
}) => {
  const { providers, models } = useModelsValue();
  const model = models.find((m) => m.id === modelId) ?? {
    id: modelId,
    name: modelId,
    providerId: modelId.split("/")[0] ?? "",
    isFree: false,
  };
  const provider = providers.find((p) => p.id === model.providerId);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

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

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            title="Change model"
            variant="outline"
            className={cn("w-full justify-between gap-2", className)}
          >
            <span className="flex items-center gap-2 truncate min-w-0">
              {provider && <ProviderIcon providerId={provider.id} />}
              <span className="truncate">{model.name ?? modelId}</span>
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            </span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[100dvh] w-screen gap-0 p-0">
          <ModelDropdownContents
            onSelect={handleChangePanelModel}
            currentModelId={modelId}
            onClose={() => setIsOpen(false)}
            variant="sheet"
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          title="Change model"
          variant="outline"
          className={cn("w-full justify-between gap-2", className)}
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            {provider && <ProviderIcon providerId={provider.id} />}
            <span className="truncate">{model.name ?? modelId}</span>
            {model.isFree && <FreeTag className="hidden sm:inline-flex" />}
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        {isOpen && (
          <ModelDropdownContents
            onSelect={handleChangePanelModel}
            currentModelId={modelId}
            onClose={() => setIsOpen(false)}
          />
        )}
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
