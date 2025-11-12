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
import { TabsContent } from "@/components/ui/tabs";
import { useInstructions } from "@/hooks/use-instructions";
import { useProjectsValue } from "@/hooks/use-projects";
import { trpc } from "@/lib/trpc/client";
import { InstructionItem } from "./instruction-item";
import { InstructionModal, type InstructionDraft } from "./instruction-modal";

const ALL_PROJECTS_VALUE = "__all__";

type ClosedModalState = { open: false };
type CreateModalState = {
  open: true;
  mode: "create";
  draft: InstructionDraft;
};
type EditModalState = {
  open: true;
  mode: "edit";
  instructionId: string;
  draft: InstructionDraft;
};

type ModalState = ClosedModalState | CreateModalState | EditModalState;

const EMPTY_DRAFT: InstructionDraft = {
  title: "",
  content: "",
  projectId: null,
};

export const PreferencesInstructionsTab: FC = () => {
  const t = useTranslations("UserPreferences.instructions");
  const [instructions, setInstructions] = useInstructions();
  const projects = useProjectsValue();

  const [modalState, setModalState] = useState<ModalState>({ open: false });

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
  const updateInstruction = trpc.instructions.update.useMutation();
  const toggleInstruction = trpc.instructions.setActive.useMutation();
  const deleteInstruction = trpc.instructions.delete.useMutation();
  const reorderInstructions = trpc.instructions.reorder.useMutation({
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : t("errors.generic");
      toast.error(t("toast.reorderError", { message }));
    },
  });

  const handleCreateSubmit = (values: InstructionDraft) => {
    const previousInstructions = instructions.map((item) => ({ ...item }));
    const currentSorted = sortedInstructions;
    const nextOrder =
      currentSorted.length > 0
        ? (currentSorted[currentSorted.length - 1]?.order ?? 0) + 1
        : 0;

    const optimisticInstruction = {
      id: `temp-${Date.now()}`,
      title: values.title,
      content: values.content,
      projectId: values.projectId,
      isActive: true,
      order: nextOrder,
    };

    setInstructions((current) =>
      [...current, optimisticInstruction].sort((a, b) => a.order - b.order)
    );
    setModalState({ open: false });

    createInstruction.mutate(
      {
        title: values.title,
        content: values.content,
        projectId: values.projectId,
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
          setModalState({
            open: true,
            mode: "create",
            draft: {
              title: values.title,
              content: values.content,
              projectId: values.projectId,
            },
          });
        },
      }
    );
  };

  const handleEditSubmit = (
    instructionId: string,
    values: InstructionDraft
  ) => {
    const previousInstructions = instructions.map((item) => ({ ...item }));
    setInstructions((current) =>
      current.map((item) =>
        item.id === instructionId
          ? {
              ...item,
              title: values.title,
              content: values.content,
              projectId: values.projectId,
            }
          : item
      )
    );
    setModalState({ open: false });

    updateInstruction.mutate(
      {
        id: instructionId,
        title: values.title,
        content: values.content,
        projectId: values.projectId,
      },
      {
        onSuccess: (updated) => {
          setInstructions((current) =>
            current.map((item) => (item.id === updated.id ? updated : item))
          );
        },
        onError: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : t("errors.generic");
          toast.error(t("toast.updateError", { message }));
          setInstructions(previousInstructions);
          setModalState({
            open: true,
            mode: "edit",
            instructionId,
            draft: {
              title: values.title,
              content: values.content,
              projectId: values.projectId,
            },
          });
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

  const openCreateModal = (draft: InstructionDraft = EMPTY_DRAFT) => {
    setModalState({
      open: true,
      mode: "create",
      draft,
    });
  };

  const openEditModal = (instructionId: string) => {
    const instruction = instructions.find((item) => item.id === instructionId);
    if (!instruction) return;
    const projectExists = instruction.projectId
      ? projects.some((project) => project.id === instruction.projectId)
      : true;
    setModalState({
      open: true,
      mode: "edit",
      instructionId,
      draft: {
        title: instruction.title,
        content: instruction.content,
        projectId: projectExists ? instruction.projectId : null,
      },
    });
  };

  const closeModal = () => setModalState({ open: false });

  return (
    <TabsContent value="instructions" className="space-y-8">
      <section className="space-y-3">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <p className="text-muted-foreground text-sm">{t("description")}</p>
          </div>
          <Button onClick={() => openCreateModal()}>
            {t("list.addButton")}
          </Button>
        </header>
        <p className="text-muted-foreground text-sm">{t("list.helper")}</p>

        {!sortedInstructions.length ? (
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
                    onEdit={() => openEditModal(instruction.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
      {modalState.open && modalState.mode === "create" ? (
        <InstructionModal
          mode="create"
          open
          initialValues={modalState.draft}
          allProjectsValue={ALL_PROJECTS_VALUE}
          projects={projects}
          onSubmit={handleCreateSubmit}
          onClose={closeModal}
        />
      ) : null}
      {modalState.open && modalState.mode === "edit" ? (
        <InstructionModal
          mode="edit"
          open
          initialValues={modalState.draft}
          allProjectsValue={ALL_PROJECTS_VALUE}
          projects={projects}
          onSubmit={(values) =>
            handleEditSubmit(modalState.instructionId, values)
          }
          onClose={closeModal}
        />
      ) : null}
    </TabsContent>
  );
};
