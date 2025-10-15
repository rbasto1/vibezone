"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import type { SuggestionGroupsListOutput } from "@/lib/trpc/server/server";
import { Edit, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface GroupEditorProps {
  selectedGroup: SuggestionGroupsListOutput[number];
  onIsEditingChange: (isEditing: boolean) => void;
  onGroupDeleted: (groupId: string) => void;
}

export function GroupEditor({
  selectedGroup,
  onIsEditingChange,
  onGroupDeleted,
}: GroupEditorProps) {
  const locales = trpc.locales.list.useQuery();
  const translations = trpc.suggestionGroups.listTranslations.useQuery({
    suggestionGroupId: selectedGroup.id,
  });
  const utils = trpc.useUtils();
  const updateGroupMutation = trpc.suggestionGroups.update.useMutation();
  const deleteGroupMutation = trpc.suggestionGroups.delete.useMutation();
  const updateTranslationMutation =
    trpc.suggestionGroups.updateTranslation.useMutation({
      onSuccess: () => utils.suggestionGroups.listTranslations.invalidate(),
    });
  const translateMutation = trpc.locales.translate.useMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    label: "",
    icon: "",
  });
  const [selectedLocale, setSelectedLocale] = useState<string>();
  const [editTranslation, setEditTranslation] = useState({
    title: "",
    label: "",
  });

  const handleStartEdit = () => {
    setEditForm({
      id: selectedGroup.id,
      title: selectedGroup.title,
      label: selectedGroup.label,
      icon: selectedGroup.icon,
    });
    setIsEditing(true);
    onIsEditingChange(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({ id: "", title: "", label: "", icon: "" });
    onIsEditingChange(false);
    setSelectedLocale(undefined);
  };

  const handleSaveEdit = async () => {
    try {
      await updateGroupMutation.mutateAsync({
        id: selectedGroup.id,
        newId: editForm.id !== selectedGroup.id ? editForm.id : undefined,
        title: editForm.title,
        label: editForm.label,
        icon: editForm.icon,
      });
      await utils.suggestionGroups.list.invalidate();
      setIsEditing(false);
      setEditForm({ id: "", title: "", label: "", icon: "" });
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

  const handleTranslate = async () => {
    if (!selectedLocale) return;
    const result = await translateMutation.mutateAsync({
      text: [selectedGroup.title, selectedGroup.label],
      locale: selectedLocale,
    });
    const title = result.translated[0];
    const label = result.translated[1];
    if (!title || !label) {
      toast.error("Failed to translate");
      return;
    }
    setEditTranslation({
      title,
      label,
    });
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        {!isEditing && (
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
              <Button
                variant="destructive"
                onClick={handleDeleteGroup}
                disabled={
                  selectedGroup.models.length > 0 ||
                  deleteGroupMutation.isPending
                }
                title={
                  selectedGroup.models.length > 0
                    ? "Cannot delete group with models"
                    : "Delete group"
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="space-y-3 mb-4 flex flex-col">
          <label htmlFor="id">Group ID</label>
          <Input
            id="id"
            type="text"
            value={editForm.id}
            onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
            placeholder="Group ID"
          />
          <label htmlFor="icon">
            Icon name (e.g., Star, Code2, Drama, Zap)
          </label>
          <Input
            id="icon"
            type="text"
            value={editForm.icon}
            onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
            placeholder="Icon name (e.g., Star, Code2, Drama, Zap)"
          />
          <label htmlFor="title">Group title</label>
          <Input
            id="title"
            type="text"
            value={editForm.title}
            onChange={(e) =>
              setEditForm({ ...editForm, title: e.target.value })
            }
            placeholder="Group title"
          />
          <label htmlFor="label">Group description</label>
          <Input
            id="label"
            type="text"
            value={editForm.label}
            onChange={(e) =>
              setEditForm({ ...editForm, label: e.target.value })
            }
            placeholder="Group description"
          />
        </div>
      ) : (
        <p className="text-muted-foreground mb-4">{selectedGroup.label}</p>
      )}

      <div className="space-y-3 mt-4 flex flex-row gap-2 border-t pt-4">
        {locales.data?.map((locale) => (
          <Button
            key={locale.id}
            variant={
              selectedLocale === locale.id
                ? "default"
                : translations.data?.some((t) => t.localeId === locale.id)
                  ? "outline"
                  : "destructive"
            }
            disabled={!isEditing}
            onClick={() => {
              setSelectedLocale((prev) => {
                const next = prev === locale.id ? undefined : locale.id;
                const currentTranslation = translations.data?.find(
                  (t) => t.localeId === locale.id
                );
                setEditTranslation({
                  title: currentTranslation?.title ?? "",
                  label: currentTranslation?.label ?? "",
                });
                return next;
              });
            }}
          >
            {locale.id}
          </Button>
        ))}
      </div>

      {!isEditing && (
        <div className="text-xs text-muted-foreground">
          {translations.data?.map((t) => (
            <div key={t.localeId}>
              <strong>{t.localeId}</strong>: {t.title} - {t.label}
            </div>
          ))}
        </div>
      )}

      {selectedLocale && (
        <div className="space-y-3 flex flex-col">
          <label htmlFor="title">Group title</label>
          <Input
            id="title"
            type="text"
            value={editTranslation.title}
            onChange={(e) =>
              setEditTranslation({ ...editTranslation, title: e.target.value })
            }
            placeholder="Group title"
          />
          <label htmlFor="label">Group description</label>
          <Input
            id="label"
            type="text"
            value={editTranslation.label}
            onChange={(e) =>
              setEditTranslation({ ...editTranslation, label: e.target.value })
            }
            placeholder="Group description"
          />
          <div className="flex flex-row gap-2">
            <Button
              onClick={() => {
                updateTranslationMutation.mutate({
                  suggestionGroupId: selectedGroup.id,
                  localeId: selectedLocale,
                  title: editTranslation.title,
                  label: editTranslation.label,
                });
              }}
              loading={updateTranslationMutation.isPending}
            >
              Save
            </Button>
            {selectedLocale === "en" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditTranslation({
                    title: selectedGroup.title,
                    label: selectedGroup.label,
                  });
                }}
              >
                Copy
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleTranslate}
                loading={translateMutation.isPending}
              >
                Translate
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
