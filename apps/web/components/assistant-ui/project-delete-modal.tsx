"use client";

import { useMemo, useState, type FC } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/components/ui/utils";
import type { ProjectConfig } from "@/store/projects";

interface ProjectDeleteModalProps {
  project: ProjectConfig;
  projects: ProjectConfig[];
  isSubmitting?: boolean;
  onConfirm: (options: DeleteProjectOptions) => Promise<void>;
  onClose: () => void;
}

export interface DeleteProjectOptions {
  strategy: "move" | "delete";
  targetProjectId?: string;
}

export const ProjectDeleteModal: FC<ProjectDeleteModalProps> = ({
  project,
  projects,
  isSubmitting = false,
  onConfirm,
  onClose,
}) => {
  const t = useTranslations("ProjectDeleteModal");
  const [strategy, setStrategy] = useState<"move" | "delete">("move");
  const [targetProjectId, setTargetProjectId] = useState<string | null>(() => {
    const defaultTarget =
      projects.find((p) => p.isDefault && p.id !== project.id) ??
      projects.find((p) => p.id !== project.id);
    return defaultTarget?.id ?? null;
  });
  const [error, setError] = useState<string | null>(null);

  const availableTargets = useMemo(
    () => projects.filter((candidate) => candidate.id !== project.id),
    [project.id, projects]
  );

  const handleConfirm = (event: React.FormEvent) => {
    event.preventDefault();
    if (strategy === "move" && !targetProjectId) {
      setError(t("errors.selectTarget"));
      return;
    }
    setError(null);

    onConfirm({
      strategy,
      targetProjectId: strategy === "move" ? targetProjectId ?? undefined : undefined,
    }).catch((confirmError) => {
      console.error("Failed to delete project:", confirmError);
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : t("errors.generic")
      );
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <form onSubmit={handleConfirm}>
          <DialogHeader>
            <DialogTitle>{t("title", { name: project.name })}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-start gap-3 rounded-md border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  strategy === "move"
                    ? "border-ring ring-1 ring-ring"
                    : "border-border hover:border-ring"
                )}
                onClick={() => setStrategy("move")}
                disabled={isSubmitting || availableTargets.length === 0}
              >
                <span className="text-sm font-medium">
                  {t("options.move.title")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("options.move.description")}
                </span>
              </button>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-start gap-3 rounded-md border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  strategy === "delete"
                    ? "border-ring ring-1 ring-ring"
                    : "border-border hover:border-ring"
                )}
                onClick={() => setStrategy("delete")}
                disabled={isSubmitting}
              >
                <span className="text-sm font-medium text-destructive">
                  {t("options.delete.title")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("options.delete.description")}
                </span>
              </button>
            </div>

            {strategy === "move" && availableTargets.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  {t("options.move.targetLabel")}
                </label>
                <div className="flex flex-col gap-2">
                  {availableTargets.map((candidate) => (
                    <label
                      key={candidate.id}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-sm transition hover:border-ring",
                        targetProjectId === candidate.id &&
                          "border-ring ring-1 ring-ring"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: candidate.color }}
                          aria-hidden="true"
                        />
                        <span className="font-medium">{candidate.name}</span>
                        {candidate.isDefault && (
                          <span className="text-xs text-muted-foreground">
                            {t("options.move.defaultBadge")}
                          </span>
                        )}
                      </div>
                      <input
                        type="radio"
                        name="targetProject"
                        className="h-4 w-4"
                        checked={targetProjectId === candidate.id}
                        onChange={() => setTargetProjectId(candidate.id)}
                        disabled={isSubmitting}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

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
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant={strategy === "delete" ? "destructive" : "default"}
              disabled={
                isSubmitting || (strategy === "move" && !availableTargets.length)
              }
              loading={isSubmitting}
            >
              {strategy === "move" ? t("actions.move") : t("actions.delete")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
