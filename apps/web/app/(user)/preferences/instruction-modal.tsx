"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type FC } from "react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectConfig } from "@/store/projects";

export interface InstructionDraft {
  title: string;
  content: string;
  projectId: string | null;
}

interface InstructionModalProps {
  mode: "create" | "edit";
  open: boolean;
  initialValues: InstructionDraft;
  allProjectsValue: string;
  projects: ProjectConfig[];
  onSubmit: (values: InstructionDraft) => void;
  onClose: () => void;
}

export const InstructionModal: FC<InstructionModalProps> = ({
  mode,
  open,
  initialValues,
  allProjectsValue,
  projects,
  onSubmit,
  onClose,
}) => {
  const t = useTranslations("UserPreferences.instructions");
  const [title, setTitle] = useState(initialValues.title);
  const [content, setContent] = useState(initialValues.content);
  const [projectId, setProjectId] = useState(
    initialValues.projectId ?? allProjectsValue
  );

  useEffect(() => {
    if (!open) return;
    setTitle(initialValues.title);
    setContent(initialValues.content);
    setProjectId(initialValues.projectId ?? allProjectsValue);
  }, [
    allProjectsValue,
    initialValues.content,
    initialValues.projectId,
    initialValues.title,
    open,
  ]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      toast.error(t("errors.missingFields"));
      return;
    }

    onSubmit({
      title: trimmedTitle,
      content: trimmedContent,
      projectId: projectId === allProjectsValue ? null : projectId,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}
    >
      <DialogContent className="sm:max-w-[540px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? t("modal.editTitle") : t("modal.createTitle")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {mode === "edit"
                ? t("modal.editDescription")
                : t("modal.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium"
                htmlFor="instruction-modal-title"
              >
                {t("form.title.label")}
              </label>
              <Input
                id="instruction-modal-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                placeholder={t("form.title.placeholder")}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium"
                htmlFor="instruction-modal-project"
              >
                {t("form.project.label")}
              </label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger
                  className="w-full justify-between"
                  id="instruction-modal-project"
                >
                  <SelectValue
                    placeholder={t("form.project.placeholder")}
                    aria-hidden
                    className="sr-only"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={allProjectsValue}>
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
                htmlFor="instruction-modal-content"
              >
                {t("form.content.label")}
              </label>
              <textarea
                id="instruction-modal-content"
                className="min-h-[180px] w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={t("form.content.placeholder")}
                maxLength={4000}
                aria-invalid={content.length >= 4000}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("modal.cancel")}
            </Button>
            <Button type="submit">
              {mode === "edit" ? t("form.update") : t("form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
