"use client";

import { useDroppable } from "@dnd-kit/core";

import { useTranslations } from "next-intl";
import type { FC } from "react";

import type { UseChatActionsResult } from "@/hooks/use-chat-actions";
import type { ProjectConfig } from "@/store/projects";
import { CustomThreadListItem } from "./custom-thread-list-item";
import { DraggableItem } from "./draggable-item";
import type { ChatListItem } from "./thread-list-items";
import { PROJECT_DROPPABLE_PREFIX } from "./thread-list-items";
import { ThreadListProjectHeader } from "./thread-list-project-header";

interface ProjectSectionProps {
  project: ProjectConfig;
  chats: ChatListItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectChat: (chat: ChatListItem) => Promise<UseChatActionsResult | null>;
  projects: ProjectConfig[];
  currentChatId: string;
  loadingChatId: string | null;
  showSentinel: boolean;
  sentinelRef: (node: HTMLDivElement | null) => void;
  showLoading: boolean;
}

const buildProjectDroppableId = (projectId: string) =>
  `${PROJECT_DROPPABLE_PREFIX}${projectId}`;

export const ProjectSection: FC<ProjectSectionProps> = ({
  project,
  chats,
  collapsed,
  onToggleCollapse,
  onSelectChat,
  projects,
  currentChatId,
  loadingChatId,
  showSentinel,
  sentinelRef,
  showLoading,
}) => {
  const t = useTranslations("ThreadList");
  const { isOver, setNodeRef } = useDroppable({
    id: buildProjectDroppableId(project.id),
  });

  return (
    <div ref={setNodeRef} className="flex flex-col gap-2">
      <ThreadListProjectHeader
        project={project}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        isOver={isOver}
      />

      {!collapsed && (
        <div className="flex flex-col gap-1">
          {chats.length ? (
            chats.map((chat) => (
              <DraggableItem key={chat.id} id={chat.id}>
                <CustomThreadListItem
                  chatId={chat.id}
                  projectId={chat.project.id}
                  title={chat.title}
                  lastMessageAt={chat.lastMessageAt}
                  isActive={currentChatId === chat.id}
                  isLoading={loadingChatId === chat.id}
                  onSelect={() => onSelectChat(chat)}
                  projects={projects}
                />
              </DraggableItem>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-muted px-3 py-2 text-xs text-muted-foreground">
              {t("projectEmpty")}
            </div>
          )}
          {showSentinel && (
            <div ref={sentinelRef} className="h-16" aria-hidden />
          )}
          {showLoading && (
            <div className="text-sm text-muted-foreground p-2 panel-button-glow">
              {t("loading")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
