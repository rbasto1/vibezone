"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, type FC } from "react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar/sidebar-trigger";
import { useCurrentChatValue } from "@/hooks/use-chat";
import { useNewChatHandler } from "@/hooks/use-new-chat-handler";
import { useProjectsValue } from "@/hooks/use-projects";
import { useUser } from "@/lib/auth-client";
import { MessageCirclePlusIcon } from "lucide-react";
import { AddAiButton } from "./add-ai-button";
import { AnonMobileQuotaLabel } from "./anon-mobile-quota-label";

interface AssistantHeaderProps {
  panelCount: number;
  suggestionsUsed: boolean;
  onAddPanel?: (id: string) => void;
}

export const AssistantHeader: FC<AssistantHeaderProps> = ({
  panelCount,
  suggestionsUsed,
  onAddPanel,
}) => {
  const user = useUser();
  const t = useTranslations("ThreadListItem");
  const projects = useProjectsValue();
  const currentChat = useCurrentChatValue();
  const handleNewChat = useNewChatHandler();
  const showMobileQuotaChip = !user && suggestionsUsed;

  const currentProject = useMemo(() => {
    if (!projects.length) return null;
    if (currentChat.projectId) {
      const project = projects.find(({ id }) => id === currentChat.projectId);
      if (project) return project;
    }
    return projects.find((project) => project.isDefault) ?? projects[0] ?? null;
  }, [currentChat.projectId, projects]);

  const handleHeaderNewChat = useCallback(() => {
    if (currentProject) {
      handleNewChat({
        projectId: currentProject.id,
        projectInstructions: currentProject.instructions ?? null,
      });
      return;
    }
    handleNewChat({});
  }, [currentProject, handleNewChat]);

  return (
    <header className="flex h-16 shrink-0 items-center border-b px-4">
      <div className="flex items-center">
        <SidebarTrigger />
        {currentProject ? (
          <div
            className="ml-4 flex max-w-[12rem] items-center gap-2 text-sm font-medium text-foreground"
            aria-label={`${t("currentProject")}: ${currentProject.name}`}
            title={`${t("currentProject")}: ${currentProject.name}`}
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: currentProject.color }}
            />
            <span className="truncate hidden sm:block">
              {currentProject.name}
            </span>
          </div>
        ) : null}
      </div>

      <div className="ml-auto flex items-center">
        <AddAiButton panelCount={panelCount} onAddPanel={onAddPanel} />

        <Button
          variant="outline"
          size="icon"
          className="ml-2 md:hidden ld:hidden"
          onClick={handleHeaderNewChat}
        >
          <MessageCirclePlusIcon className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          {showMobileQuotaChip ? <AnonMobileQuotaLabel /> : <div />}
        </div>
      </div>
    </header>
  );
};
