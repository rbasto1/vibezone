"use client";

import { useTranslations } from "next-intl";
import { useState, type FC } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/utils";
import { PROJECT_COLOR_PRESETS } from "@/constants/projects";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProjectActions } from "@/hooks/use-project-actions";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import type { ProjectConfig } from "@/store/projects";

interface ProjectModalProps {
  mode: "create" | "edit";
  project?: ProjectConfig;
}

export const ProjectModal: FC<ProjectModalProps> = ({ mode, project }) => {
  const t = useTranslations("ProjectModal");
  const tColors = useTranslations("ProjectModal.colors");
  const isMobile = useIsMobile();
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState(
    project?.color ?? PROJECT_COLOR_PRESETS[0]
  );
  const [instructions, setInstructions] = useState(project?.instructions ?? "");
  const [error, setError] = useState<string | null>(null);
  const setUIState = useUIStateSetter();
  const { createProject, updateProject } = useProjectActions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = mode === "edit";
  if (isEdit && !project) throw new Error("Invalid to edit project");

  const handleClose = () =>
    setUIState({ createProject: false, editProject: undefined });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("errors.nameRequired"));
      return;
    }

    setError(null);
    const trimmedInstructions =
      instructions.trim().length > 0 ? instructions.trim() : null;

    setIsSubmitting(true);
    if (project) {
      void updateProject(project.id, {
        name: trimmedName,
        color,
        instructions: trimmedInstructions,
      })
        .then(handleClose)
        .catch((submitError) => {
          console.error("Failed to submit project form:", submitError);
          setError(
            submitError instanceof Error
              ? submitError.message
              : t("errors.generic")
          );
        })
        .finally(() => setIsSubmitting(false));
    } else {
      void createProject({
        name: trimmedName,
        color,
        instructions: trimmedInstructions,
      })
        .then(handleClose)
        .catch((submitError) => {
          console.error("Failed to submit project form:", submitError);
          setError(
            submitError instanceof Error
              ? submitError.message
              : t("errors.generic")
          );
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("editTitle") : t("createTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEdit ? t("editDescription") : t("createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="project-name">
                {t("fields.name.label")}
              </label>
              <Input
                id="project-name"
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("fields.name.placeholder")}
                disabled={isSubmitting}
                autoFocus={!isMobile}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("fields.color")}</span>
              <div className="grid grid-cols-5 gap-2">
                {PROJECT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      color === preset
                        ? "border-ring ring-1 ring-ring"
                        : "border-transparent hover:border-border"
                    )}
                    style={{ backgroundColor: preset }}
                    onClick={() => setColor(preset)}
                    aria-label={tColors(preset)}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium"
                htmlFor="project-instructions"
              >
                {t("fields.instructions.label")}
              </label>
              <textarea
                id="project-instructions"
                className="min-h-[160px] w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder={t("fields.instructions.placeholder")}
                disabled={isSubmitting}
                maxLength={20000}
              />
              <span className="text-xs text-muted-foreground">
                {t("fields.instructions.helper")}
              </span>
            </div>
            {error && (
              <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isEdit ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
