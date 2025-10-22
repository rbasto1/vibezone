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
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useCurrentChat } from "@/hooks/use-chat";
import type { UseChatActionsResult } from "@/hooks/use-chat-actions";
import { useChatActions } from "@/hooks/use-chat-actions";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import type { RouterOutputs } from "@/lib/trpc/client";
import type { ProjectConfig } from "@/store/projects";
import { ProjectSection } from "./thread-list-project";

interface ThreadListItemsProps {
  projects: ProjectConfig[];
}

export const PROJECT_DROPPABLE_PREFIX = "project-";

export const ThreadListItems: FC<ThreadListItemsProps> = ({ projects }) => {
  const t = useTranslations("ThreadList");
  const [currentChat, setCurrentChat] = useCurrentChat();
  const { loadChatById } = useChatActions();
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const setUIState = useUIStateSetter();

  const { moveChat } = useChatActions();

  const [collapsedProjects, setCollapsedProjects] = useState<
    Record<string, boolean>
  >({});

  const toggleProject = useCallback((projectId: string) => {
    setCollapsedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  }, []);

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
      const sourceProjectId =
        typeof active.data.current === "object" && active.data.current
          ? ((active.data.current as { projectId?: string }).projectId ?? null)
          : null;
      const targetProjectId = getProjectIdFromDroppable(
        typeof over.id === "string" ? over.id : null
      );
      if (!targetProjectId || !sourceProjectId) return;
      if (sourceProjectId === targetProjectId) return;

      void moveChat(chatId, targetProjectId).catch((error) => {
        console.error("Failed to move chat:", error);
        toast.error(t("errors.moveChat"));
      });
    },
    [moveChat, t]
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

  const hasProjects = projects.length > 0;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-2">
        {hasProjects ? (
          projects.map((project) => (
            <ProjectSection
              key={project.id}
              project={project}
              collapsed={!!collapsedProjects[project.id]}
              onToggleCollapse={() => toggleProject(project.id)}
              onSelectChat={handleSelectChat}
              projects={projects}
              currentChatId={currentChat.id}
              loadingChatId={loadingChatId}
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
export type ChatListItem = RouterOutputs["chats"]["listChats"]["chats"][number];
