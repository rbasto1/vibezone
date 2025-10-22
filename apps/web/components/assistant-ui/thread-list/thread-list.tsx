"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useNewChatHandler } from "@/hooks/use-new-chat-handler";
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
  const { data: projects } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });

  const handleCreateChat = useCallback(
    (project?: ProjectConfig) => {
      const chat = createChat(
        project && {
          projectId: project.id,
          projectInstructions: project.instructions ?? null,
        }
      );
      if (!chat) {
        toast.error(t("errors.createChat"));
      }
    },
    [createChat, t]
  );

  const defaultProject = useMemo(
    () =>
      projects?.find((project) => project.isDefault) ?? projects?.[0] ?? null,
    [projects]
  );

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <ThreadListSearch loggedIn={!!user} />
      <ThreadListNew
        projects={projects}
        defaultProject={defaultProject}
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
