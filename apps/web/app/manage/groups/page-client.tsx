"use client";

import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { QueryAlert } from "@/components/ui/query-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { ArrowDown, ArrowUp, Edit, Plus, Save, Trash2, X } from "lucide-react";
import type { NextPage } from "next";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const GroupsPageClient: NextPage = () => {
  const {
    data: suggestionGroups,
    error: groupsError,
    isLoading: groupsLoading,
  } = trpc.suggestionGroups.list.useQuery();

  const {
    data: modelsData,
    error: modelsError,
    isLoading: modelsLoading,
  } = trpc.models.list.useQuery();

  const utils = trpc.useUtils();
  const addModelMutation = trpc.suggestionGroups.addModel.useMutation();
  const removeModelMutation = trpc.suggestionGroups.removeModel.useMutation();
  const reorderModelsMutation =
    trpc.suggestionGroups.reorderModels.useMutation();
  const updateGroupMutation = trpc.suggestionGroups.update.useMutation();
  const createGroupMutation = trpc.suggestionGroups.create.useMutation();
  const deleteGroupMutation = trpc.suggestionGroups.delete.useMutation();

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [newModelId, setNewModelId] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    title: "",
    label: "",
    icon: "",
  });

  const selectedGroup = useMemo(() => {
    return suggestionGroups?.find((group) => group.id === selectedGroupId);
  }, [suggestionGroups, selectedGroupId]);

  const availableModels = useMemo(() => {
    if (!modelsData?.models || !selectedGroup) return [];

    return modelsData.models.filter(
      (model) => !selectedGroup.models.includes(model.id)
    );
  }, [modelsData?.models, selectedGroup]);

  const groupModels = useMemo(() => {
    if (!modelsData?.models || !selectedGroup) return [];

    return selectedGroup.models
      .map((modelId) => modelsData.models.find((m) => m.id === modelId))
      .filter((m): m is NonNullable<typeof m> => m !== undefined);
  }, [modelsData?.models, selectedGroup]);

  const handleAddModel = async () => {
    if (!newModelId || !selectedGroupId) return;

    try {
      await addModelMutation.mutateAsync({
        groupId: selectedGroupId,
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
    if (!selectedGroupId) return;

    try {
      await removeModelMutation.mutateAsync({
        groupId: selectedGroupId,
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
    if (!selectedGroup) return;

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
        groupId: selectedGroupId,
        modelIds: newModels,
      });
      await utils.suggestionGroups.list.invalidate();
      toast.success("Model order updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to reorder models: ${message}`);
    }
  };

  const handleTogglePromoted = async (groupId: string, promoted: boolean) => {
    try {
      await updateGroupMutation.mutateAsync({
        id: groupId,
        promoted,
      });
      await utils.suggestionGroups.list.invalidate();
      toast.success("Group updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to update group: ${message}`);
    }
  };

  const handleCreateGroup = async () => {
    const newId = `group-${Date.now()}`;
    try {
      await createGroupMutation.mutateAsync({
        id: newId,
        title: "New Group",
        label: "Edit this description",
        icon: "Star",
        promoted: false,
        models: [],
      });
      await utils.suggestionGroups.list.invalidate();
      setSelectedGroupId(newId);
      toast.success("New group created");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to create group: ${message}`);
    }
  };

  const handleStartEdit = () => {
    if (!selectedGroup) return;
    setEditForm({
      title: selectedGroup.title,
      label: selectedGroup.label,
      icon: selectedGroup.icon,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({ title: "", label: "", icon: "" });
  };

  const handleSaveEdit = async () => {
    if (!selectedGroupId) return;

    try {
      await updateGroupMutation.mutateAsync({
        id: selectedGroupId,
        title: editForm.title,
        label: editForm.label,
        icon: editForm.icon,
      });
      await utils.suggestionGroups.list.invalidate();
      setIsEditing(false);
      setEditForm({ title: "", label: "", icon: "" });
      toast.success("Group updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to update group: ${message}`);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroupMutation.mutateAsync({ id: groupId });
      await utils.suggestionGroups.list.invalidate();
      if (selectedGroupId === groupId) {
        setSelectedGroupId("");
      }
      toast.success("Group deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to delete group: ${message}`);
    }
  };

  if (groupsLoading || modelsLoading) {
    return (
      <div className="mx-auto max-w-[1200px] p-6">
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Suggestion Groups Management</h1>
        <p className="text-muted-foreground">
          Manage which models appear in each suggestion group
        </p>
      </div>

      <QueryAlert error={groupsError || modelsError} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Group Selection */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Select Group</h2>
              <Button
                onClick={handleCreateGroup}
                disabled={createGroupMutation.isPending || isEditing}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Group
              </Button>
            </div>
            <div className="space-y-2">
              {suggestionGroups?.map((group) => (
                <div
                  key={group.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    selectedGroupId === group.id
                      ? "border-primary bg-primary/5"
                      : isEditing
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer hover:bg-accent/50"
                  }`}
                  onClick={() => {
                    if (!isEditing) {
                      setSelectedGroupId(group.id);
                    }
                  }}
                >
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

        {/* Group Management */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <div className="space-y-6">
              {/* Group Info */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                      className="text-lg font-medium bg-background border rounded px-2 py-1 flex-1 mr-4"
                      placeholder="Group title"
                    />
                  ) : (
                    <h2 className="text-lg font-medium">
                      {selectedGroup.title}
                    </h2>
                  )}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          onClick={handleSaveEdit}
                          disabled={updateGroupMutation.isPending}
                          size="sm"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={handleStartEdit}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedGroup.promoted}
                            onChange={(e) =>
                              handleTogglePromoted(
                                selectedGroup.id,
                                e.target.checked
                              )
                            }
                            className="h-4 w-4"
                          />
                          <span className="text-sm">Promoted</span>
                        </label>
                        <button
                          onClick={() => handleDeleteGroup(selectedGroup.id)}
                          disabled={
                            selectedGroup.models.length > 0 ||
                            deleteGroupMutation.isPending
                          }
                          className="p-2 rounded hover:bg-destructive/10 text-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            selectedGroup.models.length > 0
                              ? "Cannot delete group with models"
                              : "Delete group"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="space-y-3 mb-4">
                    <input
                      type="text"
                      value={editForm.label}
                      onChange={(e) =>
                        setEditForm({ ...editForm, label: e.target.value })
                      }
                      className="w-full bg-background border rounded px-3 py-2"
                      placeholder="Group description"
                    />
                    <input
                      type="text"
                      value={editForm.icon}
                      onChange={(e) =>
                        setEditForm({ ...editForm, icon: e.target.value })
                      }
                      className="w-full bg-background border rounded px-3 py-2"
                      placeholder="Icon name (e.g., Star, Code2, Drama, Zap)"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground mb-4">
                    {selectedGroup.label}
                  </p>
                )}
              </div>

              {/* Models List */}
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
                      <div
                        key={model.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border bg-background ${
                          isEditing ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveModel(model.id, "up")}
                            disabled={index === 0 || isEditing}
                            className="p-1 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleMoveModel(model.id, "down")}
                            disabled={
                              index === groupModels.length - 1 || isEditing
                            }
                            className="p-1 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {model.provider.name}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveModel(model.id)}
                          disabled={removeModelMutation.isPending || isEditing}
                          className="p-2 rounded hover:bg-destructive/10 text-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Remove from group"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Model */}
                {!isEditing && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <select
                      className="flex-1 rounded border bg-background px-3 py-2"
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                    >
                      <option value="">Select a model to add...</option>
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider.name})
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
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">
                Select a group to manage its models
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupsPageClient;
