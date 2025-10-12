"use client";

import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { cn } from "@/components/ui/utils";
import { trpc } from "@/lib/trpc/client";
import type { SuggestionGroupsListOutput } from "@/lib/trpc/server/server";
import { GripVertical, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface GroupSelectionListProps {
  suggestionGroups: SuggestionGroupsListOutput;
  selectedGroupId: string;
  isEditing: boolean;
  onCreateGroup: () => void;
  onSelectGroup: (groupId: string) => void;
  isCreateGroupLoading: boolean;
}

export function GroupSelectionList({
  suggestionGroups,
  selectedGroupId,
  isEditing,
  onCreateGroup,
  onSelectGroup,
  isCreateGroupLoading,
}: GroupSelectionListProps) {
  const utils = trpc.useUtils();
  const reorderGroupsMutation = trpc.suggestionGroups.reorder.useMutation();
  const [orderedGroups, setOrderedGroups] =
    useState<SuggestionGroupsListOutput>(suggestionGroups);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedGroups(suggestionGroups);
  }, [suggestionGroups]);

  const originalOrderIds = useMemo(
    () => suggestionGroups.map((group) => group.id),
    [suggestionGroups]
  );

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    groupId: string
  ) => {
    if (draggingDisabled) return;
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", groupId);
    setDraggedGroupId(groupId);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetGroupId: string
  ) => {
    event.preventDefault();
    if (!draggedGroupId || draggedGroupId === targetGroupId) {
      return;
    }

    setOrderedGroups((prev) => {
      const draggedIndex = prev.findIndex(
        (group) => group.id === draggedGroupId
      );
      const targetIndex = prev.findIndex((group) => group.id === targetGroupId);
      if (draggedIndex === -1 || targetIndex === -1) {
        return prev;
      }
      const updated = [...prev];
      const [moved] = updated.splice(draggedIndex, 1);
      if (!moved) {
        return prev;
      }
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  };

  const finalizeReorder = async () => {
    if (!draggedGroupId) {
      return;
    }

    const newOrderIds = orderedGroups.map((group) => group.id);
    setDraggedGroupId(null);

    const hasChanges =
      newOrderIds.length !== originalOrderIds.length ||
      newOrderIds.some((id, index) => id !== originalOrderIds[index]);

    if (!hasChanges) {
      setOrderedGroups(suggestionGroups);
      return;
    }

    try {
      await reorderGroupsMutation.mutateAsync({
        groupIds: newOrderIds,
      });
      await utils.suggestionGroups.list.invalidate();
      toast.success("Group order updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to reorder groups: ${message}`);
      setOrderedGroups(suggestionGroups);
    }
  };

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    targetGroupId: string
  ) => {
    event.preventDefault();
    handleDragOver(event, targetGroupId);
    await finalizeReorder();
  };

  const draggingDisabled = isEditing || reorderGroupsMutation.isPending;

  return (
    <div className="lg:col-span-1">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Select Group</h2>
          <Button
            onClick={onCreateGroup}
            disabled={isCreateGroupLoading || isEditing}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Group
          </Button>
        </div>
        <div className="space-y-2">
          {orderedGroups.map((group) => (
            <div
              key={group.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                selectedGroupId === group.id && "border-primary bg-primary/5",
                draggingDisabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-accent/50",
                draggedGroupId === group.id && "opacity-75 border-primary/60",
                !draggingDisabled &&
                  selectedGroupId === group.id &&
                  "cursor-pointer"
              )}
              onClick={() => {
                if (!isEditing) {
                  onSelectGroup(group.id);
                }
              }}
              onDragOver={(event) => handleDragOver(event, group.id)}
              onDrop={(event) => handleDrop(event, group.id)}
            >
              <div
                className={cn(
                  "flex h-full items-center pt-1 text-muted-foreground",
                  draggingDisabled
                    ? "opacity-50"
                    : "cursor-grab active:cursor-grabbing"
                )}
                draggable={!draggingDisabled}
                onDragStart={(event) => handleDragStart(event, group.id)}
                onDragEnd={finalizeReorder}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DynamicIcon iconName={group.icon} size={20} />
                  <div className="font-medium">{group.title}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {group.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {group.models.length} models
                  {group.promoted && " • Promoted"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
