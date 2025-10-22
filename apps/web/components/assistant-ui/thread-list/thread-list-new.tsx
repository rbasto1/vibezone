"use client";

import {
  ChevronDownIcon,
  FolderPlusIcon,
  MessageCirclePlusIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import type { ProjectConfig } from "@/store/projects";

interface ThreadListNewProps {
  projects?: ProjectConfig[];
  defaultProject: ProjectConfig | null;
  onNewChat: (project?: ProjectConfig) => void;
}

export const ThreadListNew: FC<ThreadListNewProps> = ({
  projects,
  defaultProject,
  onNewChat,
}) => {
  const t = useTranslations("ThreadList");
  const setUIState = useUIStateSetter();

  if (!projects || !defaultProject) {
    return (
      <Button
        className="data-active:bg-muted hover:bg-muted justify-start"
        variant="ghost"
        onClick={() => onNewChat()}
      >
        <MessageCirclePlusIcon />
        {t("newChat")}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="data-active:bg-muted hover:bg-muted justify-between"
          variant="ghost"
        >
          <span className="flex items-center gap-2">
            <MessageCirclePlusIcon />
            {t("newChat")}
          </span>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {projects.map((project) => (
          <DropdownMenuItem key={project.id} onClick={() => onNewChat(project)}>
            <span
              className="mr-2 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: project.color }}
              aria-hidden="true"
            />
            <span className="flex-1 truncate">{project.name}</span>
            {project.isDefault && (
              <span className="text-xs text-muted-foreground">
                {t("defaultProjectLabel")}
              </span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setUIState({ createProject: true })}>
          <FolderPlusIcon className="mr-2 h-4 w-4" />
          {t("actions.createProject")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
