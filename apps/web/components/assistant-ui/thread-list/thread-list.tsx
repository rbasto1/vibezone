"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useNewChatHandler } from "@/hooks/use-new-chat-handler";
import { useCurrentChatValue } from "@/hooks/use-chat";
import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import type { ProjectConfig } from "@/store/projects";
import { ThreadListItems } from "./thread-list-items";
import { ThreadListNew } from "./thread-list-new";
import { ThreadListSearch } from "./thread-list-search";

export const ThreadList: FC = () => {
  const t = useTranslations("ThreadList");
  const createChat = useNewChatHandler();
  const user = useUser();
  const currentChat = useCurrentChatValue();
  const { data: projects } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });

  const defaultProject = useMemo(
    () =>
      projects?.find((project) => project.isDefault) ?? projects?.[0] ?? null,
    [projects]
  );

  const currentProject = useMemo(() => {
    if (!projects?.length) return null;
    if (currentChat.projectId) {
      const project = projects.find(
        ({ id }) => id === currentChat.projectId
      );
      if (project) return project;
    }
    return defaultProject;
  }, [currentChat.projectId, defaultProject, projects]);

  const handleCreateChat = useCallback(
    (project?: ProjectConfig) => {
      const selectedProject = project ?? currentProject ?? defaultProject;
      const chat = createChat(
        selectedProject
          ? {
              projectId: selectedProject.id,
              projectInstructions: selectedProject.instructions ?? null,
            }
          : undefined
      );
      if (!chat) {
        toast.error(t("errors.createChat"));
      }
    },
    [createChat, currentProject, defaultProject, t]
  );

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <ThreadListSearch loggedIn={!!user} />
      <ThreadListNew
        projects={projects}
        currentProject={currentProject}
        fallbackProject={defaultProject}
        onNewChat={handleCreateChat}
      />
      {user ? (
        <ThreadListItems projects={projects ?? []} />
      ) : (
        <div className="text-sm text-muted-foreground p-2">
          {t("loginRequired")}
        </div>
      )}
    </div>
  );
};
