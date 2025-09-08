"use client";

import { modelsAtom } from "@/store/models";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAtomValue } from "jotai";
import { ChevronDown } from "lucide-react";
import { useState, type FC } from "react";
import { ProviderIcon } from "../ui/providers/provider";
import { ModelDropdownContents } from "./model-dropdown-contents";

interface ModelDropdownProps {
  panelId: string;
  modelId: string;
}

export const ModelDropdown: FC<ModelDropdownProps> = ({ modelId, panelId }) => {
  const state = useAtomValue(modelsAtom);
  const providers = state.providers;
  const models = state.models;
  const model = models.find((m) => m.id === modelId);
  const provider = providers.find((p) => p.id === model?.providerId);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex items-center gap-2 text-lg px-3 py-0.5 rounded border hover:bg-muted/70 text-foreground/80 hover:text-foreground transition-colors font-medium"
          title="Change model"
        >
          <span className="flex items-center gap-2 truncate max-w-[50vw]">
            {provider && <ProviderIcon providerId={provider.id} />}
            <span className="truncate">{model?.name ?? modelId}</span>
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        {isOpen && (
          <ModelDropdownContents modelId={modelId} panelId={panelId} />
        )}
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
