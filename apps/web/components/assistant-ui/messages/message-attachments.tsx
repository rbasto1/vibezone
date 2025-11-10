"use client";

import type {
  Attachment,
  TextMessagePart,
  ThreadMessage,
  ThreadUserMessagePart,
} from "@assistant-ui/react";
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
import { AttachmentPreviewDialog } from "../attachment-preview";

const ATTACHMENT_TAG_REGEX =
  /^<attachment name="([^"]+)">\n([\s\S]*)\n<\/attachment>$/;

const isAttachmentArray = (value: unknown): value is Attachment[] => {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<Attachment>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.type === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.contentType === "string" &&
      candidate.status?.type === "complete"
    );
  });
};

const deriveUrlFromTextPart = (part: TextMessagePart): string | undefined => {
  const match = part.text.match(ATTACHMENT_TAG_REGEX);
  if (!match) return undefined;
  const [, , body] = match;
  const trimmed = body?.trim();
  if (trimmed?.startsWith("http")) return trimmed;
  return undefined;
};

const deriveAttachmentsFromMessage = (
  message: ThreadMessage | undefined
): Attachment[] => {
  if (!message || message.role !== "user") return [];
  if (Array.isArray(message.attachments) && message.attachments.length > 0) {
    return message.attachments as Attachment[];
  }

  const metadataAttachments = (message.metadata as { custom?: unknown })
    ?.custom;
  if (
    metadataAttachments &&
    typeof metadataAttachments === "object" &&
    "attachments" in metadataAttachments
  ) {
    const { attachments } = metadataAttachments as { attachments?: unknown };
    if (isAttachmentArray(attachments)) {
      return attachments;
    }
  }

  const derived: Attachment[] = [];

  message.content.forEach((part, index) => {
    if (part.type === "image") {
      derived.push({
        id: `${message.id}-image-${index}`,
        type: "image",
        name: part.filename ?? `image-${index + 1}`,
        contentType: "image/png",
        status: { type: "complete" },
        content: [part as ThreadUserMessagePart],
      });
      return;
    }

    if (part.type === "file") {
      derived.push({
        id: `${message.id}-file-${index}`,
        type: part.mimeType?.startsWith("image/")
          ? "image"
          : part.mimeType === "application/pdf"
            ? "document"
            : "file",
        name: part.filename ?? `file-${index + 1}`,
        contentType: part.mimeType ?? "application/octet-stream",
        status: { type: "complete" },
        content: [part as ThreadUserMessagePart],
      });
      return;
    }

    if (part.type === "text") {
      const url = deriveUrlFromTextPart(part);
      if (!url) return;
      const match = part.text.match(ATTACHMENT_TAG_REGEX);
      const name = match?.[1] ?? `attachment-${index + 1}`;
      derived.push({
        id: `${message.id}-text-${index}`,
        type: "document",
        name,
        contentType: name.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : "application/octet-stream",
        status: { type: "complete" },
        content: [
          {
            type: "file",
            data: url,
            filename: name,
            mimeType: name.toLowerCase().endsWith(".pdf")
              ? "application/pdf"
              : "application/octet-stream",
          } as ThreadUserMessagePart,
        ],
      });
    }
  });

  return derived;
};

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
