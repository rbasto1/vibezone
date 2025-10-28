"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { useMemo, useState, type FC } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { InstructionItem } from "./instruction-item";
import { useInstructions } from "@/hooks/use-instructions";
import { useProjectsValue } from "@/hooks/use-projects";
import { trpc } from "@/lib/trpc/client";

const ALL_PROJECTS_VALUE = "__all__";

export const PreferencesInstructionsTab: FC = () => {
  const t = useTranslations("UserPreferences.instructions");
  const [instructions, setInstructions] = useInstructions();
  const projects = useProjectsValue();

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>(ALL_PROJECTS_VALUE);
  const [content, setContent] = useState("");
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const projectLabels = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      map.set(project.id, project.name);
    });
    return map;
  }, [projects]);

  const sortedInstructions = useMemo(
    () => [...instructions].sort((a, b) => a.order - b.order),
    [instructions]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const createInstruction = trpc.instructions.create.useMutation({
    onSuccess: (created) => {
      setInstructions((previous) =>
        [...previous, created].sort((a, b) => a.order - b.order)
      );
      setTitle("");
      setContent("");
      setProjectId(ALL_PROJECTS_VALUE);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : t("errors.generic");
      toast.error(t("toast.createError", { message }));
    },
  });

  const toggleInstruction = trpc.instructions.setActive.useMutation();
  const deleteInstruction = trpc.instructions.delete.useMutation();
  const reorderInstructions = trpc.instructions.reorder.useMutation({
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : t("errors.generic");
      toast.error(t("toast.reorderError", { message }));
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      toast.error(t("errors.missingFields"));
      return;
    }

    createInstruction.mutate({
      title: trimmedTitle,
      content: trimmedContent,
      projectId: projectId === ALL_PROJECTS_VALUE ? null : projectId,
    });
  };

  const handleToggle = (id: string, checked: boolean) => {
    setPendingToggleId(id);
    setInstructions((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isActive: checked } : item
      )
    );
    toggleInstruction.mutate(
      { id, isActive: checked },
      {
        onSuccess: (updated) => {
          setInstructions((current) =>
            current.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item
            )
          );
        },
        onError: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : t("errors.generic");
          toast.error(t("toast.toggleError", { message }));
          setInstructions((current) =>
            current.map((item) =>
              item.id === id ? { ...item, isActive: !checked } : item
            )
          );
        },
        onSettled: () => setPendingToggleId(null),
      }
    );
  };

  const handleDelete = (id: string) => {
    const existing = instructions.find((item) => item.id === id);
    if (!existing) return;
    setPendingDeleteId(id);
    setInstructions((current) =>
      current.filter((instruction) => instruction.id !== id)
    );
    deleteInstruction.mutate(
      { id },
      {
        onError: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : t("errors.generic");
          toast.error(t("toast.deleteError", { message }));
          setInstructions((current) =>
            [...current, existing].sort((a, b) => a.order - b.order)
          );
        },
        onSettled: () => setPendingDeleteId(null),
      }
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previous = [...sortedInstructions];
    const oldIndex = previous.findIndex((item) => item.id === active.id);
    const newIndex = previous.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(previous, oldIndex, newIndex).map(
      (item, index) => ({
        ...item,
        order: index,
      })
    );

    setInstructions(reordered);
    reorderInstructions.mutate(
      { instructionIds: reordered.map((item) => item.id) },
      {
        onError: () => {
          setInstructions(previous);
        },
      }
    );
  };

  const isCreating = createInstruction.isPending;

  return (
    <TabsContent value="instructions" className="space-y-8">
      <section className="space-y-3">
        <header className="space-y-1.5">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </header>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border bg-card p-4"
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="instruction-title">
              {t("form.title.label")}
            </label>
            <Input
              id="instruction-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              placeholder={t("form.title.placeholder")}
              disabled={isCreating}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="instruction-project">
              {t("form.project.label")}
            </label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={isCreating}
            >
              <SelectTrigger className="w-full" id="instruction-project">
                <SelectValue placeholder={t("form.project.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS_VALUE}>
                  {t("form.project.all")}
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="instruction-content">
              {t("form.content.label")}
            </label>
            <textarea
              id="instruction-content"
              className="min-h-[160px] w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={t("form.content.placeholder")}
              maxLength={20000}
              disabled={isCreating}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isCreating} loading={isCreating}>
              {t("form.submit")}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <header className="space-y-1">
          <h3 className="text-base font-semibold">{t("list.title")}</h3>
          <p className="text-muted-foreground text-sm">{t("list.helper")}</p>
        </header>
        {sortedInstructions.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {t("list.empty")}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedInstructions.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {sortedInstructions.map((instruction) => (
                  <InstructionItem
                    key={instruction.id}
                    instruction={instruction}
                    projectLabel={
                      instruction.projectId
                        ? projectLabels.get(instruction.projectId) ??
                          t("list.deletedProject")
                        : t("form.project.all")
                    }
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    togglePending={pendingToggleId === instruction.id}
                    deletePending={pendingDeleteId === instruction.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </TabsContent>
  );
};
