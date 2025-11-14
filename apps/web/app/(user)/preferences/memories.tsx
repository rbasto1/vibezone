"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import { TabsContent } from "@/components/ui/tabs";
import { useMemoriesValue } from "@/hooks/use-memories";
import { useMutatePreferences } from "@/hooks/use-mutate-preferences";
import { useProjectsValue } from "@/hooks/use-projects";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import { BrainIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { MemoryItem } from "./memory-item";
import { PreferenceRow } from "./preference-row";

interface ProjectMetadata {
  id: string;
  name: string;
  color: string;
}

export const PreferencesMemoriesTab = () => {
  const t = useTranslations("UserPreferences.memories");
  const projects = useProjectsValue();
  const memories = useMemoriesValue();
  const preferences = useUserPreferencesValue();
  const mutatePreferences = useMutatePreferences({
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : t("errors.generic");
      toast.error(message);
    },
  });

  const projectLookup = useMemo(
    () =>
      new Map<string, ProjectMetadata>(
        projects.map((project) => [
          project.id,
          {
            id: project.id,
            name: project.name,
            color: project.color,
          },
        ])
      ),
    [projects]
  );

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
                  return (
                    <MemoryItem
                      key={memory.id}
                      memory={memory}
                      project={project}
                      projects={projects}
                      t={t}
                    />
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
