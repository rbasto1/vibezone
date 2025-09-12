"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import type { SuggestionGroupsListOutput } from "@/lib/trpc/server/server";
import { Edit, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ModelEditorProps {
  selectedGroup: SuggestionGroupsListOutput[number];
  onIsEditingChange: (isEditing: boolean) => void;
  onGroupDeleted: (groupId: string) => void;
}

export function ModelEditor({
  selectedGroup,
  onIsEditingChange,
  onGroupDeleted,
}: ModelEditorProps) {
  const utils = trpc.useUtils();
  const updateGroupMutation = trpc.suggestionGroups.update.useMutation();
  const deleteGroupMutation = trpc.suggestionGroups.delete.useMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    label: "",
    icon: "",
  });

  const handleStartEdit = () => {
    setEditForm({
      title: selectedGroup.title,
      label: selectedGroup.label,
      icon: selectedGroup.icon,
    });
    setIsEditing(true);
    onIsEditingChange(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({ title: "", label: "", icon: "" });
    onIsEditingChange(false);
  };

  const handleSaveEdit = async () => {
    try {
      await updateGroupMutation.mutateAsync({
        id: selectedGroup.id,
        title: editForm.title,
        label: editForm.label,
        icon: editForm.icon,
      });
      await utils.suggestionGroups.list.invalidate();
      setIsEditing(false);
      setEditForm({ title: "", label: "", icon: "" });
      onIsEditingChange(false);
      toast.success("Group updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to update group: ${message}`);
    }
  };

  const handleTogglePromoted = async (promoted: boolean) => {
    try {
      await updateGroupMutation.mutateAsync({
        id: selectedGroup.id,
        promoted,
      });
      await utils.suggestionGroups.list.invalidate();
      toast.success("Group updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to update group: ${message}`);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroupMutation.mutateAsync({ id: selectedGroup.id });
      await utils.suggestionGroups.list.invalidate();
      onGroupDeleted(selectedGroup.id);
      toast.success("Group deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to delete group: ${message}`);
    }
  };
  return (
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
          <h2 className="text-lg font-medium">{selectedGroup.title}</h2>
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
              <Button onClick={handleCancelEdit} variant="outline" size="sm">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleStartEdit} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedGroup.promoted}
                  onChange={(e) => handleTogglePromoted(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm">Promoted</span>
              </label>
              <button
                onClick={handleDeleteGroup}
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
            onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
            className="w-full bg-background border rounded px-3 py-2"
            placeholder="Icon name (e.g., Star, Code2, Drama, Zap)"
          />
        </div>
      ) : (
        <p className="text-muted-foreground mb-4">{selectedGroup.label}</p>
      )}
    </div>
  );
}
