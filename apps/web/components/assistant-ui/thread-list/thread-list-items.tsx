"use client";

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useSidebar } from "@/components/ui/sidebar/sidebar-context";
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
  const { isMobile, setOpenMobile } = useSidebar();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 1000, tolerance: 8 },
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
        if (isMobile) {
          setOpenMobile(false);
        }
      }
    },
    [
      isMobile,
      loadChatById,
      loadingChatId,
      setCurrentChat,
      setOpenMobile,
      setUIState,
    ]
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
              onSelectChat={handleSelectChat}
              projects={projects}
              currentChatId={currentChat.id}
              loadingChatId={loadingChatId}
              activeProjectId={currentChat.projectId}
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
