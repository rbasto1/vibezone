"use client";

import {
  ChevronDownIcon,
  FolderIcon,
  FolderPlusIcon,
  MoreVerticalIcon,
  Trash2Icon,
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
import { cn } from "@/components/ui/utils";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import type { ProjectConfig } from "@/store/projects";

interface ThreadListProjectHeaderProps {
  project: ProjectConfig;
  collapsed: boolean;
  isOver: boolean;
  onToggleCollapse: () => void;
}

export const ThreadListProjectHeader: FC<ThreadListProjectHeaderProps> = ({
  project,
  collapsed,
  isOver,
  onToggleCollapse,
}) => {
  const t = useTranslations("ThreadList");
  const setUIState = useUIStateSetter();

  const handleEditProject = () => {
    setUIState({ editProject: project });
  };

  const handleCreateProject = () => {
    setUIState({ createProject: true });
  };

  const handleDeleteProject = () => {
    setUIState({ deleteProject: project });
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-transparent px-2 py-1 transition",
        isOver && "border-dashed border-ring bg-muted/60"
      )}
    >
      <button
        type="button"
        className="flex flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition hover:bg-muted"
        onClick={onToggleCollapse}
      >
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "-rotate-90"
          )}
        />
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: project.color }}
            aria-hidden="true"
          />
          {project.name}
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={handleEditProject}>
            <FolderIcon className="mr-2 h-4 w-4" />
            {t("projectMenu.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCreateProject}>
            <FolderPlusIcon className="mr-2 h-4 w-4" />
            {t("projectMenu.create")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={
              project.isDefault
                ? (e) => {
                    e.preventDefault();
                  }
                : handleDeleteProject
            }
            title={
              project.isDefault ? t("projectMenu.deleteDisabled") : undefined
            }
            className={cn(
              "flex items-center gap-2 text-sm text-destructive",
              project.isDefault && "opacity-50 cursor-not-allowed"
            )}
          >
            <Trash2Icon className="h-4 w-4" />
            {t("projectMenu.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
