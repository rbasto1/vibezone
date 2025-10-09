"use client";

import { AlertTriangleIcon, FileIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface IncompatibleAttachment {
  id: string;
  name: string;
  type: "image" | "document" | "file";
  incompatibleModels: Array<{
    id: string;
    name: string;
  }>;
}

interface IncompatibleAttachmentsModalProps {
  onOpenChange: (open: boolean) => void;
  incompatibleAttachments: IncompatibleAttachment[];
  onRemoveAttachment: (attachmentId: string) => void;
  onClose: () => void;
}

export const IncompatibleAttachmentsModal: FC<
  IncompatibleAttachmentsModalProps
> = ({
  onOpenChange,
  incompatibleAttachments,
  onRemoveAttachment,
  onClose,
}) => {
  const t = useTranslations("IncompatibleAttachmentsModal");

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-destructive" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {incompatibleAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="rounded-lg border border-border bg-muted/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileIcon className="size-5 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("incompatibleWith")}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {attachment.incompatibleModels.map((model) => (
                        <li
                          key={model.id}
                          className="text-sm text-muted-foreground flex items-center gap-1.5"
                        >
                          <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                          {model.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  aria-label={t("removeAttachment")}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <p className="text-sm text-muted-foreground text-left">
            {t("instructions")}
          </p>
          <Button onClick={onClose} className="w-full sm:w-auto">
            {t("understood")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
