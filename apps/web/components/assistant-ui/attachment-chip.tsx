"use client";

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

const guessIcon = (file: File): LucideIcon => {
  const mimeType = file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (mimeType.startsWith("image/") || imageExtensions.includes(extension)) {
    return FileImage;
  }

  if (mimeType.startsWith("video/") || videoExtensions.includes(extension)) {
    return FileVideo;
  }

  if (mimeType.startsWith("audio/") || audioExtensions.includes(extension)) {
    return FileAudio;
  }

  if (mimeType === "application/pdf" || extension === "pdf") {
    return FileText;
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
          <ChipLeading className="bg-background/80">
            <Icon className="size-4" />
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
