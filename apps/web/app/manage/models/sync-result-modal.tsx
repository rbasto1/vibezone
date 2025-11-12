"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/components/ui/utils";
import type { ModelsSyncFromOpenRouterOutput } from "@/lib/trpc/server/server";
import { XIcon } from "lucide-react";

interface SyncResultModalProps {
  result: ModelsSyncFromOpenRouterOutput;
  onClose: () => void;
  onSelectModel: (modelId: string) => void;
}

interface TabConfig {
  value: string;
  label: string;
  isModel: boolean;
  content: string[];
}

const SyncResultModal = ({
  result,
  onClose,
  onSelectModel,
}: SyncResultModalProps) => {
  const tabConfigs = useMemo<TabConfig[]>(
    () => [
      {
        value: "added-providers",
        label: `New providers (${result.addedProviders.length})`,
        isModel: false,
        content: result.addedProviders,
      },
      {
        value: "added-models",
        label: `New models (${result.addedModels.length})`,
        isModel: true,
        content: result.addedModels,
      },
      {
        value: "updated-models",
        label: `Updated  (${result.updatedModels.length})`,
        isModel: true,
        content: result.updatedModels,
      },
      {
        value: "deleted-models",
        label: `Deleted (${result.deletedModels.length})`,
        isModel: true,
        content: result.deletedModels,
      },
      {
        value: "undeleted-models",
        label: `Restored (${result.undeletedModels.length})`,
        isModel: true,
        content: result.undeletedModels,
      },
      {
        value: "translated-models",
        label: `Translated (${result.translatedModels.length})`,
        isModel: true,
        content: result.translatedModels,
      },
      {
        value: "added-parameters",
        label: `New parameters (${result.addedSupportedParameters.length})`,
        isModel: false,
        content: result.addedSupportedParameters,
      },
    ],
    [result]
  );

  if (!tabConfigs.length) return null;

  const visibleTabs = tabConfigs.filter((tab) => !!tab.content.length);
  const firstWithResults = visibleTabs[0];
  const initialTab = firstWithResults?.value;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] rounded-lg border bg-background shadow-2xl">
      <div className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Sync results</h2>
            <p className="text-muted-foreground text-sm">
              Review the updates from the latest OpenRouter sync.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="px-4 pb-4 pt-3">
        {!initialTab ? (
          <div>
            <p className="text-muted-foreground text-sm">No changes.</p>
          </div>
        ) : (
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="mb-7 flex-wrap gap-1">
              {visibleTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {visibleTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <div className="h-64 overflow-y-auto pr-1">
                  {tab.content.map((id) => (
                    <li
                      key={id}
                      className={cn("text-sm", tab.isModel && "cursor-pointer")}
                      onClick={
                        tab.isModel ? () => onSelectModel(id) : undefined
                      }
                    >
                      {id}
                    </li>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default SyncResultModal;
