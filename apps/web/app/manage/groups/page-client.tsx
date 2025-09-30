"use client";

import { QueryAlert } from "@/components/ui/query-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import type { NextPage } from "next";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { GroupEditor, GroupModelsList, GroupSelectionList } from "./components";

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
  const modelsDataSafe = modelsData ?? {
    models: [],
    providers: [],
    groups: [],
  };

  const utils = trpc.useUtils();
  const createGroupMutation = trpc.suggestionGroups.create.useMutation();

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const selectedGroup = useMemo(() => {
    return suggestionGroups?.find((group) => group.id === selectedGroupId);
  }, [suggestionGroups, selectedGroupId]);

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

  const handleGroupDeleted = (groupId: string) => {
    if (selectedGroupId === groupId) {
      setSelectedGroupId("");
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
        {!!suggestionGroups && (
          <GroupSelectionList
            suggestionGroups={suggestionGroups}
            selectedGroupId={selectedGroupId}
            isEditing={isEditing}
            onCreateGroup={handleCreateGroup}
            onSelectGroup={setSelectedGroupId}
            isCreateGroupLoading={createGroupMutation.isPending}
          />
        )}

        <div className="lg:col-span-2">
          {selectedGroup ? (
            <div className="space-y-6">
              <GroupEditor
                selectedGroup={selectedGroup}
                onIsEditingChange={setIsEditing}
                onGroupDeleted={handleGroupDeleted}
              />

              <GroupModelsList
                selectedGroup={selectedGroup}
                modelsData={modelsDataSafe}
                isEditing={isEditing}
              />
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
