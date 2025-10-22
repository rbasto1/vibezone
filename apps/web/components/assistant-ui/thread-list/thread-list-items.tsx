"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useCurrentChat } from "@/hooks/use-chat";
import type { UseChatActionsResult } from "@/hooks/use-chat-actions";
import { useChatActions } from "@/hooks/use-chat-actions";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import type { RouterOutputs } from "@/lib/trpc/client";
import { trpc } from "@/lib/trpc/client";
import type { RouterInputs } from "@/lib/trpc/server/server";
import type { ProjectConfig } from "@/store/projects";
import { ProjectSection } from "./thread-list-project";

export type ChatListItem = RouterOutputs["chats"]["listChats"]["chats"][number];

interface ThreadListItemsProps {
  listInput: RouterInputs["chats"]["listChats"];
  projects: ProjectConfig[];
}

export const PROJECT_DROPPABLE_PREFIX = "project-";

export const ThreadListItems: FC<ThreadListItemsProps> = ({
  listInput,
  projects,
}) => {
  const t = useTranslations("ThreadList");
  const [currentChat, setCurrentChat] = useCurrentChat();
  const { loadChatById } = useChatActions();
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const setUIState = useUIStateSetter();

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.chats.listChats.useInfiniteQuery(listInput, {
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });
  const { moveChat } = useChatActions();

  const chats = useMemo(
    () => data?.pages.flatMap((page) => page.chats) ?? [],
    [data]
  );

  const chatById = useMemo(() => {
    return new Map<string, ChatListItem>(chats.map((chat) => [chat.id, chat]));
  }, [chats]);

  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null
  );
  const handleSentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinelElement(node);
  }, []);

  const chatsByProject = useMemo(() => {
    const map = new Map<string, ChatListItem[]>();
    for (const project of projects) {
      map.set(project.id, []);
    }
    for (const chat of chats) {
      const list = map.get(chat.project.id);
      if (list) {
        list.push(chat);
      } else {
        map.set(chat.project.id, [chat]);
      }
    }
    return map;
  }, [chats, projects]);

  const [collapsedProjects, setCollapsedProjects] = useState<
    Record<string, boolean>
  >({});

  const toggleProject = useCallback((projectId: string) => {
    setCollapsedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  }, []);

  const expandedProjects = useMemo(
    () => projects.filter((project) => !collapsedProjects[project.id]),
    [projects, collapsedProjects]
  );
  const sentinelProjectId = expandedProjects.at(-1)?.id ?? null;

  useEffect(() => {
    if (!sentinelElement || !expandedProjects.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    observer.observe(sentinelElement);

    return () => {
      observer.disconnect();
    };
  }, [
    expandedProjects.length,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sentinelElement,
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const chatId = String(active.id);
      const targetProjectId = getProjectIdFromDroppable(
        typeof over.id === "string" ? over.id : null
      );
      if (!targetProjectId) return;
      const chat = chatById.get(chatId);
      if (!chat || chat.project.id === targetProjectId) return;

      void moveChat(chatId, targetProjectId).catch((error) => {
        console.error("Failed to move chat:", error);
        toast.error(t("errors.moveChat"));
      });
    },
    [chatById, moveChat, t]
  );

  const handleSelectChat = useCallback(
    async (chat: ChatListItem): Promise<UseChatActionsResult | null> => {
      if (loadingChatId) return null;

      setLoadingChatId(chat.id);
      setUIState({ panelOpen: null });
      setCurrentChat({
        id: chat.id,
        createdAt: new Date(),
        addedToList: true,
        projectId: chat.project.id,
        fetchedTitlePanelId: "loaded-from-db",
      });

      try {
        const result = await loadChatById(chat.id);
        if (!result.success) {
          console.error(`Failed to load chat ${chat.id}:`, result.error);
        }

        setUIState({ suggestionsUsed: true });
        return result;
      } finally {
        setLoadingChatId(null);
      }
    },
    [loadChatById, loadingChatId, setCurrentChat, setUIState]
  );

  if (error) {
    return <div className="text-sm p-2 text-destructive">{error.message}</div>;
  }

  if (isLoading && !data) {
    return (
      <div className="text-sm text-muted-foreground p-2">{t("loading")}</div>
    );
  }

  const hasProjects = projects.length > 0;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-2">
        {hasProjects ? (
          projects.map((project) => (
            <ProjectSection
              key={project.id}
              project={project}
              chats={chatsByProject.get(project.id) ?? []}
              collapsed={!!collapsedProjects[project.id]}
              onToggleCollapse={() => toggleProject(project.id)}
              onSelectChat={handleSelectChat}
              projects={projects}
              currentChatId={currentChat.id}
              loadingChatId={loadingChatId}
              showSentinel={sentinelProjectId === project.id}
              sentinelRef={handleSentinelRef}
              showLoading={
                isFetchingNextPage && sentinelProjectId === project.id
              }
            />
          ))
        ) : (
          <div className="text-sm text-muted-foreground p-2">
            {t("noProjects")}
          </div>
        )}
      </div>
    </DndContext>
  );
};

const getProjectIdFromDroppable = (id: string | null | undefined) => {
  if (!id) return null;
  return id.startsWith(PROJECT_DROPPABLE_PREFIX)
    ? id.slice(PROJECT_DROPPABLE_PREFIX.length)
    : id;
};
