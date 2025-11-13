"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TabsContent } from "@/components/ui/tabs";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useMemories } from "@/hooks/use-memories";
import { useMutatePreferences } from "@/hooks/use-mutate-preferences";
import { useProjectsValue } from "@/hooks/use-projects";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import { trpc } from "@/lib/trpc/client";
import { BrainIcon, CopyIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PreferenceRow } from "./preference-row";

interface ProjectMetadata {
  id: string;
  name: string;
  color: string;
}

export const PreferencesMemoriesTab = () => {
  const t = useTranslations("UserPreferences.memories");
  const projects = useProjectsValue();
  const [memories, setMemories] = useMemories();
  const preferences = useUserPreferencesValue();
  const mutatePreferences = useMutatePreferences({
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : t("errors.generic");
      toast.error(message);
    },
  });

  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingCopy, setPendingCopy] = useState<string | null>(null);

  const setActiveMutation = trpc.memories.setActive.useMutation();
  const deleteMutation = trpc.memories.delete.useMutation();
  const copyMutation = trpc.memories.copyToProject.useMutation();

  const projectLookup = useMemo(() => {
    const map = new Map<string, ProjectMetadata>();
    projects.forEach((project) =>
      map.set(project.id, {
        id: project.id,
        name: project.name,
        color: project.color,
      })
    );
    return map;
  }, [projects]);

  const sortedMemories = useMemo(
    () =>
      memories.toSorted(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [memories]
  );

  const handleAutomaticToggle = (value: boolean) => {
    const previous = preferences.automaticMemoriesDisabled;
    if (previous === value) return;
    mutatePreferences(
      { automaticMemoriesDisabled: value },
      { previousValues: { automaticMemoriesDisabled: previous } }
    );
  };

  const handleToggleMemory = (id: string, next: boolean) => {
    setPendingToggle(id);
    setMemories((current) =>
      current.map((memory) =>
        memory.id === id ? { ...memory, isActive: next } : memory
      )
    );

    setActiveMutation.mutate(
      { id, isActive: next },
      {
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : t("errors.toggle");
          toast.error(message);
          setMemories((current) =>
            current.map((memory) =>
              memory.id === id ? { ...memory, isActive: !next } : memory
            )
          );
        },
        onSettled: () => setPendingToggle(null),
        onSuccess: (result) => {
          setMemories((current) =>
            current.map((memory) =>
              memory.id === result.id ? { ...memory, ...result } : memory
            )
          );
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    setPendingDelete(id);
    const previous = memories;
    setMemories((current) => current.filter((memory) => memory.id !== id));

    deleteMutation.mutate(
      { id },
      {
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : t("errors.delete");
          toast.error(message);
          setMemories(previous);
        },
        onSettled: () => setPendingDelete(null),
      }
    );
  };

  const handleCopy = (id: string, targetProjectId: string) => {
    setPendingCopy(id);
    copyMutation.mutate(
      { memoryId: id, targetProjectId },
      {
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : t("errors.copy");
          toast.error(message);
        },
        onSuccess: (result) => {
          setMemories((current) => [result].concat(current));
          toast.success(t("toast.copy"));
        },
        onSettled: () => setPendingCopy(null),
      }
    );
  };

  return (
    <TabsContent value="memories" className="space-y-6">
      <PreferenceRow
        id="automatic-memories"
        label={t("automatic.label")}
        description={t("automatic.description")}
        checked={preferences.automaticMemoriesDisabled}
        onToggle={handleAutomaticToggle}
      />

      <section className="space-y-4">
        <header className="space-y-1.5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BrainIcon className="size-5 text-muted-foreground" />
            {t("title")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("helper")}</p>
        </header>

        {!sortedMemories.length ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t("table.memory")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t("table.project")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t("table.createdAt")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {t("table.status")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {sortedMemories.map((memory) => {
                  const project = projectLookup.get(memory.projectId);
                  const createdAt = new Date(memory.createdAt);
                  const formattedDate = createdAt.toLocaleString();
                  return (
                    <tr key={memory.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {memory.title || t("table.untitled")}
                        </div>
                        <p className="text-muted-foreground text-xs line-clamp-2">
                          {memory.content}
                        </p>
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-3">
                        <ToggleSwitch
                          checked={memory.isActive}
                          onChange={(value) =>
                            handleToggleMemory(memory.id, value)
                          }
                          disabled={pendingToggle === memory.id}
                          label={t("table.toggle")}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                  pendingCopy === memory.id ||
                                  projects.length <= 1
                                }
                              >
                                <CopyIcon className="mr-2 size-4" />
                                {t("actions.copy")}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {projects
                                .filter(
                                  (projectOption) =>
                                    projectOption.id !== memory.projectId
                                )
                                .map((projectOption) => (
                                  <DropdownMenuItem
                                    key={projectOption.id}
                                    onSelect={() =>
                                      handleCopy(memory.id, projectOption.id)
                                    }
                                  >
                                    {projectOption.name}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(memory.id)}
                            disabled={pendingDelete === memory.id}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2Icon className="mr-2 size-4" />
                            {t("actions.delete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </TabsContent>
  );
};
