"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatActions } from "@/hooks/use-chat-actions";
import { useCurrentChatSetter, useCurrentChatValue } from "@/hooks/use-chat";
import { useProjectsValue } from "@/hooks/use-projects";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import type { ProjectConfig } from "@/store/projects";
import { CheckIcon, FolderPlusIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, type FC } from "react";

export const GlobalComposerProjectButton: FC = () => {
  const projects = useProjectsValue();
  const currentChat = useCurrentChatValue();
  const setCurrentChat = useCurrentChatSetter();
  const { moveChat } = useChatActions();
  const setUIState = useUIStateSetter();
  const t = useTranslations("GlobalComposer");
  const threadListT = useTranslations("ThreadList");
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const defaultProject = useMemo(
    () => projects.find((project) => project.isDefault) ?? projects[0] ?? null,
    [projects]
  );

  const currentProject = useMemo(() => {
    if (!projects.length) return null;
    if (currentChat.projectId) {
      const project = projects.find((p) => p.id === currentChat.projectId);
      if (project) return project;
    }
    return defaultProject;
  }, [currentChat.projectId, defaultProject, projects]);

  const handleSelectProject = useCallback(
    async (project: ProjectConfig) => {
      if (!project || project.id === currentProject?.id) {
        return;
      }

      setPendingProjectId(project.id);

      try {
        if (currentChat.addedToList) {
          await moveChat(currentChat.id, project.id);
        }

        setCurrentChat((prev) => ({
          ...prev,
          projectId: project.id,
        }));
      } finally {
        setPendingProjectId(null);
      }
    },
    [currentChat.addedToList, currentChat.id, currentProject?.id, moveChat, setCurrentChat]
  );

  if (!currentProject) {
    return null;
  }

  const isBusy = pendingProjectId !== null;

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 rounded-full border border-border/60 bg-background/60 px-2.5 text-sm font-medium text-foreground hover:bg-accent/40"
          aria-label={t("projectButtonLabel", { project: currentProject.name })}
          title={t("projectButtonLabel", { project: currentProject.name })}
          type="button"
          aria-busy={isBusy}
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: currentProject.color }}
          />
          <span className="max-w-[8.5rem] truncate">{currentProject.name}</span>
          {isBusy ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {threadListT("chooseProject")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onSelect={(event) => {
              event.preventDefault();
              setMenuOpen(false);
              void handleSelectProject(project);
            }}
            disabled={pendingProjectId !== null && pendingProjectId !== project.id}
          >
            <span
              aria-hidden="true"
              className="mr-2 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <span className="flex-1 truncate">{project.name}</span>
            {pendingProjectId === project.id ? (
              <Loader2Icon className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : project.id === currentProject.id ? (
              <CheckIcon className="h-3.5 w-3.5 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setMenuOpen(false);
            setUIState({ createProject: true });
          }}
        >
          <FolderPlusIcon className="mr-2 h-4 w-4" />
          {threadListT("actions.createProject")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
