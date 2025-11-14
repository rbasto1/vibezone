"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useMemories } from "@/hooks/use-memories";
import { trpc } from "@/lib/trpc/client";
import type { MemoryConfig } from "@/store/memories";
import { CopyIcon, Trash2Icon } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";

interface ProjectMetadata {
  id: string;
  name: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
}

interface MemoryItemProps {
  memory: MemoryConfig;
  project: ProjectMetadata | undefined;
  projects: Project[];
  t: (key: string) => string;
}

export const MemoryItem: FC<MemoryItemProps> = ({
  memory,
  project,
  projects,
  t,
}) => {
  const [memories, setMemories] = useMemories();

  const setActiveMutation = trpc.memories.setActive.useMutation();
  const deleteMutation = trpc.memories.delete.useMutation();
  const copyMutation = trpc.memories.copyToProject.useMutation();

  const handleToggle = (value: boolean) => {
    setMemories((current) =>
      current.map((m) => (m.id === memory.id ? { ...m, isActive: value } : m))
    );

    setActiveMutation.mutate(
      { id: memory.id, isActive: value },
      {
        onError: (error) => {
          toast.error(error.message);
          setMemories((current) =>
            current.map((m) =>
              m.id === memory.id ? { ...m, isActive: !value } : m
            )
          );
        },
        onSuccess: (result) => {
          setMemories((current) =>
            current.map((m) => (m.id === result.id ? { ...m, ...result } : m))
          );
        },
      }
    );
  };

  const handleDelete = () => {
    const previous = memories.find((m) => m.id === memory.id);
    if (!previous) return;
    setMemories((current) => current.filter((m) => m.id !== memory.id));

    deleteMutation.mutate(
      { id: memory.id },
      {
        onError: (error) => {
          toast.error(error.message);
          setMemories((current) => current.concat(previous));
        },
      }
    );
  };

  const handleCopy = (targetProjectId: string) => {
    const optimisticId = crypto.randomUUID();
    setMemories((current) =>
      current.concat({
        ...memory,
        id: optimisticId,
        projectId: targetProjectId,
        createdAt: new Date(),
      })
    );
    copyMutation.mutate(
      { memoryId: memory.id, targetProjectId },
      {
        onError: (error) => {
          toast.error(error.message);
          setMemories((current) =>
            current.filter((m) => m.id !== optimisticId)
          );
        },
        onSuccess: (result) => {
          setMemories((current) =>
            current.map((m) => (m.id === optimisticId ? result : m))
          );
        },
      }
    );
  };

  const formattedDate = memory.createdAt.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{memory.title || t("table.untitled")}</div>
        <p className="text-muted-foreground text-xs">{memory.content}</p>
      </td>
      <td className="px-4 py-3 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm">
          {project ? (
            <>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: project.color }}
                aria-hidden="true"
              />
              <span>{project.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {t("table.missingProject")}
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={copyMutation.isPending || projects.length <= 1}
            >
              <CopyIcon className="mr-2 size-4" />
              {t("actions.copy")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {projects
              .filter((projectOption) => projectOption.id !== memory.projectId)
              .map((projectOption) => (
                <DropdownMenuItem
                  key={projectOption.id}
                  onSelect={() => handleCopy(projectOption.id)}
                >
                  {projectOption.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formattedDate}</td>
      <td className="px-4 py-3">
        <ToggleSwitch
          checked={memory.isActive}
          onChange={handleToggle}
          disabled={setActiveMutation.isPending}
          label={t("table.toggle")}
        />
      </td>
      <td className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="text-destructive hover:text-destructive"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </td>
    </tr>
  );
};
