"use client";

import type { Attachment } from "@assistant-ui/react";
import { useAssistantState } from "@assistant-ui/react";
import { FileImageIcon, FileTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { FaRegFilePdf } from "react-icons/fa";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/components/ui/utils";
import { useAttachmentSrc } from "@/hooks/use-attachments";
import { deriveUrlFromTextPart } from "@/lib/assistant-ui/message-converters";
import { deriveAttachmentsFromMessage } from "@/lib/assistant-ui/thread-message-attachments";
import { AttachmentPreviewDialog } from "../attachment-preview";

interface AttachmentThumbProps {
  attachment: Attachment;
  altText: string;
}

const AttachmentThumb: FC<AttachmentThumbProps> = ({ attachment, altText }) => {
  const isImage = attachment.type === "image";
  const src = useAttachmentSrc(attachment);
  const type = attachment.contentType;

  if (type === "application/pdf") {
    return (
      <span className="flex size-full items-center justify-center text-muted-foreground">
        <FaRegFilePdf className="size-8" />
      </span>
    );
  }

  if (!type.startsWith("image/")) {
    return (
      <span className="flex size-full items-center justify-center text-muted-foreground">
        <FileTextIcon className="size-8" />
      </span>
    );
  }

  return (
    <Avatar className="h-full w-full rounded-none">
      <AvatarImage src={src} alt={altText} className="object-cover" />
      <AvatarFallback delayMs={isImage ? 200 : 0}>
        <FileImageIcon className="size-8 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
};

const getAttachmentUrl = (attachment: Attachment): string | undefined => {
  for (const part of attachment.content ?? []) {
    if (part.type === "file" && typeof part.data === "string") {
      return part.data;
    }
    if (part.type === "text") {
      const url = deriveUrlFromTextPart(part);
      if (url) return url;
    }
  }
  return undefined;
};

const AttachmentTile: FC<{ attachment: Attachment }> = ({ attachment }) => {
  const t = useTranslations("MessageAttachments");

  const typeName = (() => {
    switch (attachment.type) {
      case "image":
        return t("types.image");
      case "document":
        return t("types.document");
      case "file":
        return t("types.file");
      default:
        return attachment.type;
    }
  })();

  const altText = t("previewAlt");
  const ariaLabel = t("ariaLabel", { type: typeName });
  const href = getAttachmentUrl(attachment);
  const tileContent = (
    <div
      className={cn(
        "size-14 cursor-pointer overflow-hidden rounded-[14px] border bg-muted transition-opacity hover:opacity-80"
      )}
      role="button"
      aria-label={ariaLabel}
    >
      <div className="flex size-full items-center justify-center bg-background/80">
        <AttachmentThumb attachment={attachment} altText={altText} />
      </div>
    </div>
  );

  const trigger = (() => {
    if (attachment.type === "image") {
      return (
        <AttachmentPreviewDialog attachment={attachment}>
          <TooltipTrigger asChild>{tileContent}</TooltipTrigger>
        </AttachmentPreviewDialog>
      );
    }

    if (href) {
      return (
        <TooltipTrigger asChild>
          <Button
            className="cursor-pointer transition-colors hover:bg-accent/50"
            asChild
          >
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              {tileContent}
            </a>
          </Button>
        </TooltipTrigger>
      );
    }

    return <TooltipTrigger asChild>{tileContent}</TooltipTrigger>;
  })();

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Tooltip>
        {trigger}
        <TooltipContent side="top">{attachment.name}</TooltipContent>
      </Tooltip>
      <span className="max-w-14 truncate text-xs font-medium text-muted-foreground">
        {attachment.name}
      </span>
    </div>
  );
};

export const UserMessageAttachments: FC = () => {
  const message = useAssistantState(({ message }) => message);
  const attachments = deriveAttachmentsFromMessage(message);
  if (!attachments.length) return null;

  return (
    <div className="col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2">
      {attachments.map((attachment) => (
        <AttachmentTile key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
};
