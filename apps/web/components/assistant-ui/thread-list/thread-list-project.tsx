"use client";

import { useDroppable } from "@dnd-kit/core";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { UseChatActionsResult } from "@/hooks/use-chat-actions";
import { trpc } from "@/lib/trpc/client";
import type { ProjectConfig } from "@/store/projects";
import { CustomThreadListItem } from "./custom-thread-list-item";
import { DraggableItem } from "./draggable-item";
import type { ChatListItem } from "./thread-list-items";
import { PROJECT_DROPPABLE_PREFIX } from "./thread-list-items";
import { ThreadListProjectHeader } from "./thread-list-project-header";

interface ProjectSectionProps {
  project: ProjectConfig;
  onSelectChat: (chat: ChatListItem) => Promise<UseChatActionsResult | null>;
  projects: ProjectConfig[];
  currentChatId: string;
  loadingChatId: string | null;
}

const buildProjectDroppableId = (projectId: string) =>
  `${PROJECT_DROPPABLE_PREFIX}${projectId}`;

export const ProjectSection: FC<ProjectSectionProps> = ({
  project,
  onSelectChat,
  projects,
  currentChatId,
  loadingChatId,
}) => {
  const t = useTranslations("ThreadList");
  const { isOver, setNodeRef } = useDroppable({
    id: buildProjectDroppableId(project.id),
  });
  const [isCollapsed, setIsCollapsed] = useState(!project.isDefault);
  const queryInput = useMemo(() => ({ projectId: project.id }), [project.id]);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.chats.listChats.useInfiniteQuery(queryInput, {
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: !isCollapsed,
  });

  const chats = useMemo(
    () => data?.pages.flatMap((page) => page.chats) ?? [],
    [data]
  );

  const showInitialLoading = isLoading && !data;
  const showEmptyState = !showInitialLoading && chats.length === 0 && !error;

  return (
    <div ref={setNodeRef} className="flex flex-col gap-2">
      <ThreadListProjectHeader
        project={project}
        collapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isOver={isOver}
      />

      {!isCollapsed && (
        <div className="flex flex-col gap-1">
          {error ? (
            <div className="text-sm p-2 text-destructive">{error.message}</div>
          ) : showEmptyState ? (
            <div className="rounded-md border border-dashed border-muted px-3 py-2 text-xs text-muted-foreground">
              {t("projectEmpty")}
            </div>
          ) : (
            chats.map((chat) => (
              <DraggableItem
                key={chat.id}
                id={chat.id}
                data={{ projectId: chat.project.id }}
              >
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
          )}
          {(isFetchingNextPage || isLoading) && (
            <div className="text-sm text-muted-foreground p-2 panel-button-glow mx-2">
              {t("loading")}
            </div>
          )}
          {hasNextPage && !isFetchingNextPage && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start w-full"
              onClick={() => void fetchNextPage()}
            >
              {t("loadMore") + "…"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
