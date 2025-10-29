"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { useInstructions } from "@/hooks/use-instructions";
import { useProjectsValue } from "@/hooks/use-projects";
import { trpc } from "@/lib/trpc/client";
import { InstructionItem } from "./instruction-item";

const ALL_PROJECTS_VALUE = "__all__";

export const PreferencesInstructionsTab: FC = () => {
  const t = useTranslations("UserPreferences.instructions");
  const [instructions, setInstructions] = useInstructions();
  const projects = useProjectsValue();

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>(ALL_PROJECTS_VALUE);
  const [content, setContent] = useState("");

  const projectMetadata = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    projects.forEach((project) => {
      map.set(project.id, { name: project.name, color: project.color });
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

  const createInstruction = trpc.instructions.create.useMutation();

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

    const previousInstructions = instructions.map((item) => ({ ...item }));
    const previousFormState = {
      title,
      content,
      projectId,
    };

    const resolvedProjectId =
      projectId === ALL_PROJECTS_VALUE ? null : projectId;
    const nextOrder =
      sortedInstructions.length > 0
        ? (sortedInstructions[sortedInstructions.length - 1]?.order ?? 0) + 1
        : 0;
    const optimisticInstruction = {
      id: `temp-${Date.now()}`,
      title: trimmedTitle,
      content: trimmedContent,
      projectId: resolvedProjectId,
      isActive: true,
      order: nextOrder,
    };

    setInstructions((current) =>
      [...current, optimisticInstruction].sort((a, b) => a.order - b.order)
    );
    setTitle("");
    setContent("");
    setProjectId(ALL_PROJECTS_VALUE);

    createInstruction.mutate(
      {
        title: trimmedTitle,
        content: trimmedContent,
        projectId: resolvedProjectId,
      },
      {
        onSuccess: (created) => {
          setInstructions((current) =>
            current
              .map((item) =>
                item.id === optimisticInstruction.id ? created : item
              )
              .sort((a, b) => a.order - b.order)
          );
        },
        onError: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : t("errors.generic");
          toast.error(t("toast.createError", { message }));
          setInstructions(previousInstructions);
          setTitle(previousFormState.title);
          setContent(previousFormState.content);
          setProjectId(previousFormState.projectId);
        },
      }
    );
  };

  const handleToggle = (id: string, checked: boolean) => {
    const previousInstructions = instructions.map((item) => ({ ...item }));
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
          setInstructions(previousInstructions);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    const previousInstructions = instructions.map((item) => ({ ...item }));
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
          setInstructions(previousInstructions);
        },
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
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium"
              htmlFor="instruction-project"
            >
              {t("form.project.label")}
            </label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger
                className="w-full justify-between"
                id="instruction-project"
              >
                <SelectValue
                  placeholder={t("form.project.placeholder")}
                  aria-hidden
                  className="sr-only"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS_VALUE}>
                  <span className="flex items-center gap-2 truncate">
                    <span className="truncate">{t("form.project.all")}</span>
                  </span>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="flex items-center gap-2 truncate">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="truncate">{project.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium"
              htmlFor="instruction-content"
            >
              {t("form.content.label")}
            </label>
            <textarea
              id="instruction-content"
              className="min-h-[160px] w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={t("form.content.placeholder")}
              maxLength={20000}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit">{t("form.submit")}</Button>
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
                        ? (projectMetadata.get(instruction.projectId)?.name ??
                          t("list.deletedProject"))
                        : t("form.project.all")
                    }
                    projectColor={
                      instruction.projectId
                        ? projectMetadata.get(instruction.projectId)?.color
                        : null
                    }
                    onToggle={handleToggle}
                    onDelete={handleDelete}
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
