"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useMemo } from "react";

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
import type { LucideIcon } from "lucide-react";
import {
  FileArchive,
  FileAudio,
  FileCode,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  XIcon,
} from "lucide-react";

interface AttachmentChipProps {
  attachment: File;
  onRemove: (attachment: File) => void;
  className?: string;
}

const imageExtensions = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "bmp",
  "svg",
];

const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];
const audioExtensions = ["mp3", "wav", "aac", "flac", "ogg", "m4a"];
const archiveExtensions = ["zip", "rar", "7z", "tar", "gz", "bz2"];
const spreadsheetExtensions = ["xls", "xlsx", "csv", "tsv", "ods"];
const codeExtensions = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "cs",
  "php",
  "html",
  "css",
  "scss",
  "sql",
  "yml",
  "yaml",
  "xml",
  "md",
];

const isImageFile = (file: File) => {
  const mimeType = file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  return mimeType.startsWith("image/") || imageExtensions.includes(extension);
};

const useImagePreview = (file: File | undefined) => {
  const [previewSrc, setPreviewSrc] = React.useState<string>();

  React.useEffect(() => {
    if (!file) {
      setPreviewSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return previewSrc;
};

const guessIcon = (file: File): LucideIcon => {
  const mimeType = file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (mimeType.startsWith("video/")) {
    return FileVideo;
  }

  if (mimeType.startsWith("audio/")) {
    return FileAudio;
  }

  if (mimeType === "application/pdf") {
    return FileText;
  }

  if (isImageFile(file)) {
    return FileImage;
  }

  if (extension === "pdf") {
    return FileText;
  }

  if (videoExtensions.includes(extension)) {
    return FileVideo;
  }

  if (audioExtensions.includes(extension)) {
    return FileAudio;
  }

  if (spreadsheetExtensions.includes(extension)) {
    return FileSpreadsheet;
  }

  if (archiveExtensions.includes(extension)) {
    return FileArchive;
  }

  if (codeExtensions.includes(extension)) {
    return FileCode;
  }

  return FileIcon;
};

const AttachmentChip: React.FC<AttachmentChipProps> = ({
  attachment,
  onRemove,
  className,
}) => {
  const Icon = useMemo(() => guessIcon(attachment), [attachment]);
  const isImage = useMemo(() => isImageFile(attachment), [attachment]);
  const previewSrc = useImagePreview(isImage ? attachment : undefined);

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
              isImage && "bg-transparent shadow-none"
            )}
          >
            {isImage && previewSrc ? (
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
