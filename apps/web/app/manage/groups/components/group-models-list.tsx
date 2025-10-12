"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import type {
  ModelsListOutput,
  SuggestionGroupsListOutput,
} from "@/lib/trpc/server/server";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
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
  const [pastedModelId, setPastedModelId] = useState("");
  const [orderedModelIds, setOrderedModelIds] = useState<string[]>(
    selectedGroup.models
  );
  const [draggedModelId, setDraggedModelId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedModelIds(selectedGroup.models);
  }, [selectedGroup.models]);

  const groupModels = useMemo(
    () =>
      orderedModelIds.map(
        (modelId) =>
          modelsData.models.find((model) => model.id === modelId) ?? {
            id: modelId,
            name: "(model deleted)",
            provider: {
              name: "(missing)",
            },
          }
      ),
    [modelsData.models, orderedModelIds]
  );

  const availableModels = modelsData.models
    .filter((model) => !orderedModelIds.includes(model.id))
    .toSorted((a, b) => a.id.localeCompare(b.id));

  const handleAddModel = async (modelId?: string) => {
    const targetModelId = modelId || newModelId;
    if (!targetModelId) return;

    try {
      await addModelMutation.mutateAsync({
        groupId: selectedGroup.id,
        modelId: targetModelId,
      });
      await utils.suggestionGroups.list.invalidate();
      setNewModelId("");
      setPastedModelId("");
      toast.success("Model added to group");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to add model: ${message}`);
    }
  };

  const handlePasteModelId = async () => {
    if (!pastedModelId.trim()) return;
    await handleAddModel(pastedModelId.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePasteModelId();
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

  const handleMoveModel = async (modelId: string, targetIndex: number) => {
    const previousOrder = orderedModelIds;
    const currentIndex = previousOrder.indexOf(modelId);
    if (currentIndex === -1) return;

    // Clamp target index to valid range
    const clampedTargetIndex = Math.max(
      0,
      Math.min(targetIndex, previousOrder.length - 1)
    );

    // If already at target position, no need to move
    if (currentIndex === clampedTargetIndex) return;

    const newModels = [...previousOrder];
    const [movedModel] = newModels.splice(currentIndex, 1);
    newModels.splice(clampedTargetIndex, 0, movedModel!);

    setOrderedModelIds(newModels);

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
      setOrderedModelIds(previousOrder);
    }
  };

  const finalizeReorder = async () => {
    if (!draggedModelId) {
      return;
    }

    const previousOrder = selectedGroup.models;
    const newOrder = orderedModelIds;
    setDraggedModelId(null);

    const hasChanges =
      newOrder.length !== previousOrder.length ||
      newOrder.some((modelId, index) => modelId !== previousOrder[index]);

    if (!hasChanges) {
      setOrderedModelIds(previousOrder);
      return;
    }

    try {
      await reorderModelsMutation.mutateAsync({
        groupId: selectedGroup.id,
        modelIds: newOrder,
      });
      await utils.suggestionGroups.list.invalidate();
      toast.success("Model order updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to reorder models: ${message}`);
      setOrderedModelIds(previousOrder);
    }
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, modelId: string) => {
    if (isEditing || reorderModelsMutation.isPending) return;
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", modelId);
    setDraggedModelId(modelId);
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
    targetModelId: string
  ) => {
    event.preventDefault();
    if (!draggedModelId || draggedModelId === targetModelId) {
      return;
    }

    setOrderedModelIds((prev) => {
      const draggedIndex = prev.indexOf(draggedModelId);
      const targetIndex = prev.indexOf(targetModelId);
      if (draggedIndex === -1 || targetIndex === -1) {
        return prev;
      }
      const updated = [...prev];
      const [moved] = updated.splice(draggedIndex, 1);
      if (!moved) {
        return prev;
      }
      const insertIndex = Math.min(
        updated.length,
        targetIndex + (draggedIndex < targetIndex ? 1 : 0)
      );
      updated.splice(insertIndex, 0, moved);
      return updated;
    });
  };

  const handleDrop = async (
    event: DragEvent<HTMLDivElement>,
    targetModelId: string
  ) => {
    event.preventDefault();
    handleDragOver(event, targetModelId);
    await finalizeReorder();
  };

  const handleDragEnd = async () => {
    await finalizeReorder();
  };

  const draggingDisabled = isEditing || reorderModelsMutation.isPending;

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
              onDragStart={
                draggingDisabled
                  ? undefined
                  : (event) => handleDragStart(event, model.id)
              }
              onDragOver={
                draggingDisabled
                  ? undefined
                  : (event) => handleDragOver(event, model.id)
              }
              onDrop={
                draggingDisabled
                  ? undefined
                  : (event) => handleDrop(event, model.id)
              }
              onDragEnd={draggingDisabled ? undefined : handleDragEnd}
              draggingDisabled={draggingDisabled}
              isDragging={draggedModelId === model.id}
            />
          ))}
        </div>
      )}

      {/* Add Model */}
      <div className="space-y-3 mt-4 pt-4 border-t">
        {/* Dropdown for selecting from available models */}
        <div className="flex gap-2">
          <Select
            value={newModelId}
            onValueChange={(value) => setNewModelId(value)}
            disabled={isEditing}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a model to add..." />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => handleAddModel()}
            disabled={!newModelId || addModelMutation.isPending}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Input field for pasting model IDs */}
        <div className="flex gap-2">
          <Input
            placeholder="Or paste a model ID here..."
            value={pastedModelId}
            onChange={(e) => setPastedModelId(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isEditing || addModelMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handlePasteModelId}
            disabled={!pastedModelId.trim() || addModelMutation.isPending}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
