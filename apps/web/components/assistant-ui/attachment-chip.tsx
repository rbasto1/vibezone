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
import { File as FileIcon, FileImage, FileText, XIcon } from "lucide-react";
import { AttachmentPreviewDialog } from "./attachment-preview";

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

const guessIcon = (attachment: Attachment): LucideIcon => {
  switch (attachment.type) {
    case "document":
      return FileText;
    case "image":
      return FileImage;
    case "file":
      return FileText;
    default:
      return FileIcon;
  }
};

const AttachmentChip: React.FC<AttachmentChipProps> = ({
  attachment,
  onRemove,
  className,
}) => {
  const Icon = useMemo(() => guessIcon(attachment), [attachment]);
  const previewSrc = useImagePreview(
    attachment.type === "image" ? attachment : undefined
  );

  const handleRemove = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onRemove(attachment);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Chip
          className={cn("max-w-[12rem] cursor-default select-none", className)}
        >
          <ChipLeading
            className={cn(
              "bg-background/80",
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
          <ChipLabel>{attachment.name}</ChipLabel>
          <ChipTrailing>
            <ChipDismissButton
              aria-label={`Remove ${attachment.name}`}
              onClick={handleRemove}
              className="hover:bg-destructive/15"
            >
              <XIcon className="size-4" />
            </ChipDismissButton>
          </ChipTrailing>
        </Chip>
      </TooltipTrigger>
      <TooltipContent side="top">{attachment.name}</TooltipContent>
    </Tooltip>
  );
};

export { AttachmentChip };
