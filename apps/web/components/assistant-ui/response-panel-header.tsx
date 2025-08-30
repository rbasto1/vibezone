"use client";

import { cn } from "@/components/ui/utils";
import { modelsAtom } from "@/store/models";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAtomValue } from "jotai";
import { ChevronDown, XIcon } from "lucide-react";

export interface PanelHeaderProps {
  modelId: string;
  onClose?: () => void;
  onChangeModel: (providerId: string, modelId: string) => void;
  onStop?: () => void;
}

import type { FC } from "react";
import { ProviderIcon } from "../ui/providers/provider";

export const PanelHeader: FC<PanelHeaderProps> = ({
  modelId,
  onClose,
  onChangeModel,
  onStop,
}) => {
  const modelsResponse = useAtomValue(modelsAtom);
  const models = modelsResponse.models;
  const modelLabel = models.find((m) => m.id === modelId)?.name ?? modelId;

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
      <div className="flex items-center gap-2 min-w-0">
        {onChangeModel ? (
          <ModelDropdown modelId={modelId} onChangeModel={onChangeModel} />
        ) : (
          <div className="font-medium truncate">{modelLabel}</div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onStop && (
          <button
            className="p-1 rounded hover:bg-muted"
            onClick={onStop}
            aria-label="Stop streaming"
            title="Stop streaming"
          >
            {/* stop icon as a square */}
            <span className="inline-block h-4 w-4 bg-foreground/80" />
          </button>
        )}
        <button
          className={cn(
            "p-1 rounded hover:bg-muted",
            onClose ? "opacity-100" : "opacity-40 cursor-not-allowed"
          )}
          onClick={onClose}
          aria-label="Close panel"
          title={onClose ? "Close panel" : "At least one panel must remain"}
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

interface ModelDropdownProps {
  modelId: string;
  onChangeModel: (providerId: string, modelId: string) => void;
}

// Helper to get the provider for a model
const ModelDropdown: FC<ModelDropdownProps> = ({ modelId, onChangeModel }) => {
  const state = useAtomValue(modelsAtom);
  const models = state.models;
  const providers = state.providers;
  const model = models.find((m) => m.id === modelId);
  const provider = providers.find((p) => p.id === model?.providerId);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex items-center gap-2 text-lg px-3 py-0.5 rounded border hover:bg-muted/70 text-foreground/80 hover:text-foreground transition-colors font-medium"
          title="Change model"
        >
          <span className="flex items-center gap-2">
            {provider && <ProviderIcon providerId={provider.id} />}
            {model?.name}
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="z-50 min-w-[240px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
        {
          <div className="max-h-80 overflow-auto">
            {providers!.map((p) => (
              <div key={p.id} className="py-1">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ProviderIcon providerId={p.id} /> {p.name}
                  </span>
                </div>
                {models
                  .filter((m) => m.providerId === p.id)
                  .map((m) => (
                    <DropdownMenu.Item
                      key={m.id}
                      className="cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                      onSelect={() => onChangeModel(p.id, m.id)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={cn(
                            m.id === modelId ? "font-bold" : "font-medium"
                          )}
                        >
                          {m.name}
                        </span>
                      </span>
                    </DropdownMenu.Item>
                  ))}
              </div>
            ))}
          </div>
        }
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
