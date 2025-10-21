"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from "react";

import {
  Chip,
  ChipDismissButton,
  ChipLabel,
  ChipLeading,
  ChipTrailing,
} from "@/components/ui/chip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/components/ui/utils";
import type { Attachment } from "@assistant-ui/react";
import type { LucideIcon } from "lucide-react";
import { FileImageIcon, FileTextIcon, XIcon } from "lucide-react";
import { FaRegFilePdf } from "react-icons/fa";
import type { IconType } from "react-icons/lib";
import { AttachmentPreviewDialog } from "./attachment-preview";
import { useTranslations } from "next-intl";

interface AttachmentChipProps {
  attachment: Attachment;
  onRemove: (attachment: Attachment) => void;
  className?: string;
}

const useImagePreview = (attachment: Attachment | undefined) => {
  const [previewSrc, setPreviewSrc] = useState<string>();

  useEffect(() => {
    if (!attachment) {
      setPreviewSrc(undefined);
      return;
    }

    if (!attachment.file) {
      return;
    }
    const objectUrl = URL.createObjectURL(attachment.file);
    setPreviewSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [attachment]);

  return previewSrc;
};

const guessIcon = (attachment: Attachment): LucideIcon | IconType => {
  if (attachment.contentType.startsWith("image/")) {
    return FileImageIcon;
  }
  if (attachment.contentType.startsWith("application/pdf")) {
    return FaRegFilePdf;
  }
  return FileTextIcon;
};

const AttachmentChip: React.FC<AttachmentChipProps> = ({
  attachment,
  onRemove,
  className,
}) => {
  const t = useTranslations("AttachmentChip");
  const Icon = useMemo(() => guessIcon(attachment), [attachment]);
  const previewSrc = useImagePreview(
    attachment.type === "image" ? attachment : undefined
  );
  const uploadProgress =
    attachment.status.type === "running" &&
    attachment.status.reason === "uploading"
      ? Math.max(
          0,
          Math.min(100, Math.round(attachment.status.progress ?? 0))
        )
      : attachment.status.type === "complete"
        ? 100
        : null;
  const isUploading =
    attachment.status.type === "running" &&
    attachment.status.reason === "uploading";

  const handleRemove = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onRemove(attachment);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Chip
          className={cn(
            "relative max-w-[12rem] cursor-default select-none overflow-hidden",
            className
          )}
        >
          {uploadProgress !== null && uploadProgress < 100 ? (
            <span
              className="absolute inset-y-0 left-0 z-0 h-full bg-primary/15 transition-[width] duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
              aria-hidden
            />
          ) : null}
          <ChipLeading
            className={cn(
              "relative z-10 bg-background/80",
              previewSrc && "bg-transparent shadow-none"
            )}
          >
            <AttachmentPreviewDialog
              attachment={attachment}
              className="bg-inherit"
            >
              {previewSrc ? (
                <span className="flex size-full items-center justify-center overflow-hidden rounded-lg bg-muted">
                  <img
                    src={previewSrc}
                    alt={attachment.name}
                    className="size-full object-cover"
                    draggable={false}
                  />
                </span>
              ) : (
                <Icon className="size-4" />
              )}
            </AttachmentPreviewDialog>
          </ChipLeading>
          <ChipLabel className="relative z-10">
            {isUploading && uploadProgress !== null && uploadProgress < 100
              ? `${attachment.name} (${uploadProgress}%)`
              : attachment.name}
          </ChipLabel>
          <ChipTrailing className="relative z-10">
            <ChipDismissButton
              aria-label={t("remove", { name: attachment.name ?? "" })}
              onClick={handleRemove}
              className="hover:bg-destructive/15"
            >
              <XIcon className="size-4" />
            </ChipDismissButton>
          </ChipTrailing>
        </Chip>
      </TooltipTrigger>
      <TooltipContent side="top">
        {isUploading && uploadProgress !== null && uploadProgress < 100
          ? `${attachment.name ?? ""} (${uploadProgress}%)`
          : attachment.name}
      </TooltipContent>
    </Tooltip>
  );
};

export { AttachmentChip };
