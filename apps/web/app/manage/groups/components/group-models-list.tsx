"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import type {
  ModelsListOutput,
  SuggestionGroupsListOutput,
} from "@/lib/trpc/server/server";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GroupModelsListItem } from "./group-models-list-item";

interface GroupModelsListProps {
  selectedGroup: SuggestionGroupsListOutput[number];
  modelsData: ModelsListOutput;
  isEditing: boolean;
}

export function GroupModelsList({
  selectedGroup,
  modelsData,
  isEditing,
}: GroupModelsListProps) {
  const utils = trpc.useUtils();
  const addModelMutation = trpc.suggestionGroups.addModel.useMutation();
  const removeModelMutation = trpc.suggestionGroups.removeModel.useMutation();
  const reorderModelsMutation =
    trpc.suggestionGroups.reorderModels.useMutation();

  const [newModelId, setNewModelId] = useState("");

  const groupModels = selectedGroup.models.map(
    (modelId) =>
      modelsData.models.find((model) => model.id === modelId) ?? {
        id: modelId,
        name: "(model deleted)",
        provider: {
          name: "(missing)",
        },
      }
  );

  const availableModels = modelsData.models
    .filter((model) => !selectedGroup.models.includes(model.id))
    .toSorted((a, b) => a.id.localeCompare(b.id));

  const handleAddModel = async () => {
    if (!newModelId) return;

    try {
      await addModelMutation.mutateAsync({
        groupId: selectedGroup.id,
        modelId: newModelId,
      });
      await utils.suggestionGroups.list.invalidate();
      setNewModelId("");
      toast.success("Model added to group");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to add model: ${message}`);
    }
  };

  const handleRemoveModel = async (modelId: string) => {
    try {
      await removeModelMutation.mutateAsync({
        groupId: selectedGroup.id,
        modelId,
      });
      await utils.suggestionGroups.list.invalidate();
      toast.success("Model removed from group");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to remove model: ${message}`);
    }
  };

  const handleMoveModel = async (modelId: string, direction: "up" | "down") => {
    const currentIndex = selectedGroup.models.indexOf(modelId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= selectedGroup.models.length) return;

    const newModels = [...selectedGroup.models];
    if (!newModels[currentIndex] || !newModels[newIndex]) return;
    [newModels[currentIndex], newModels[newIndex]] = [
      newModels[newIndex]!,
      newModels[currentIndex]!,
    ];

    try {
      await reorderModelsMutation.mutateAsync({
        groupId: selectedGroup.id,
        modelIds: newModels,
      });
      await utils.suggestionGroups.list.invalidate();
      toast.success("Model order updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to reorder models: ${message}`);
    }
  };
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-medium mb-4">
        Models in Group ({groupModels.length})
      </h3>
      {!groupModels.length ? (
        <p className="text-muted-foreground text-center py-8">
          No models in this group yet
        </p>
      ) : (
        <div className="space-y-2">
          {groupModels.map((model, index) => (
            <GroupModelsListItem
              key={model.id}
              model={model}
              index={index}
              totalModels={groupModels.length}
              onMoveModel={isEditing ? undefined : handleMoveModel}
              onRemoveModel={isEditing ? undefined : handleRemoveModel}
            />
          ))}
        </div>
      )}

      {/* Add Model */}
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <select
          className="flex-1 rounded border bg-background px-3 py-2"
          value={newModelId}
          onChange={(e) => setNewModelId(e.target.value)}
          disabled={isEditing}
        >
          <option value="">Select a model to add...</option>
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.id}
            </option>
          ))}
        </select>
        <Button
          onClick={handleAddModel}
          disabled={!newModelId || addModelMutation.isPending}
          size="sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
