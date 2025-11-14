"use client";

import { useTranslations } from "next-intl";
import { useState, type ChangeEvent, type FC } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/utils";
import { useMemories } from "@/hooks/use-memories";
import { useProjectsValue } from "@/hooks/use-projects";
import { trpc } from "@/lib/trpc/client";

type MemoryScope = "prompt" | "response" | "chat";

const SCOPE_OPTIONS: Array<{
  value: MemoryScope;
  translationKey: "prompt" | "response" | "chat";
}> = [
  { value: "prompt", translationKey: "prompt" },
  { value: "response", translationKey: "response" },
  { value: "chat", translationKey: "chat" },
];

interface CreateMemoryModalProps {
  onOpenChange: (open: boolean) => void;
  chatId: string | null;
  messageId: string | null;
  projectId: string | null;
}

export const CreateMemoryModal: FC<CreateMemoryModalProps> = ({
  onOpenChange,
  chatId,
  messageId,
  projectId,
}) => {
  const t = useTranslations("MemoryModal");
  const projects = useProjectsValue();
  const [, setMemories] = useMemories();

  const project = projectId
    ? (projects.find((item) => item.id === projectId) ?? null)
    : null;

  const [scope, setScope] = useState<MemoryScope>("prompt");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hasPreview, setHasPreview] = useState(false);

  const previewMutation = trpc.memories.preview.useMutation();
  const createMutation = trpc.memories.create.useMutation();

  const handlePreview = () => {
    if (!chatId || !messageId || !projectId) {
      toast.error(t("errors.missingContext"));
      return;
    }
    previewMutation.mutate(
      {
        chatId,
        messageId,
        scope,
      },
      {
        onSuccess: (result) => {
          if (!result) {
            toast.error(t("errors.preview"));
            return;
          }
          setTitle(result.title);
          setContent(result.content);
          setHasPreview(true);
        },
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : t("errors.preview");
          toast.error(message);
        },
      }
    );
  };

  const handleSave = () => {
    if (!projectId) {
      toast.error(t("errors.missingProject"));
      return;
    }
    createMutation.mutate(
      {
        title: title.trim(),
        content: content.trim(),
        projectId,
      },
      {
        onSuccess: (created) => {
          setMemories((current) => [created].concat(current));
          toast.success(t("toast.success"));
          onOpenChange(false);
        },
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : t("errors.create");
          toast.error(message);
        },
      }
    );
  };

  const previewDisabled =
    !chatId || !messageId || !projectId || previewMutation.isPending;
  const saveDisabled =
    !hasPreview ||
    !title.trim().length ||
    !content.trim().length ||
    createMutation.isPending;

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.currentTarget.value);
  };

  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.currentTarget.value);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
          {project && (
            <p className="text-xs text-muted-foreground">
              {t("projectLabel", { project: project.name })}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <span className="text-sm font-medium">{t("scope.label")}</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {SCOPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm cursor-pointer transition",
                    scope === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <input
                    type="radio"
                    name="memory-scope"
                    value={option.value}
                    checked={scope === option.value}
                    onChange={() => setScope(option.value)}
                    className="sr-only"
                  />
                  <div className="font-medium">
                    {t(`scope.${option.translationKey}.title`)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(`scope.${option.translationKey}.description`)}
                  </p>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="memory-title">
              {t("fields.title")}
            </label>
            <Input
              id="memory-title"
              value={title}
              onChange={handleTitleChange}
              placeholder={t("fields.titlePlaceholder")}
              disabled={!hasPreview || createMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="memory-content">
              {t("fields.content")}
            </label>
            <Textarea
              id="memory-content"
              rows={6}
              value={content}
              onChange={handleContentChange}
              placeholder={t("fields.contentPlaceholder")}
              disabled={!hasPreview || createMutation.isPending}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={previewDisabled}
          >
            {previewMutation.isPending
              ? t("actions.previewing")
              : t("actions.preview")}
          </Button>
          <Button onClick={handleSave} disabled={saveDisabled}>
            {createMutation.isPending ? t("actions.saving") : t("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
