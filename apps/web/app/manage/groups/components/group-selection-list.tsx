"use client";

import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import type { SuggestionGroupsListOutput } from "@/lib/trpc/server/server";
import { Plus } from "lucide-react";

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
                  onSelectGroup(group.id);
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
  );
}
