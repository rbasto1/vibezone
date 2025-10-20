"use client";

import { FileImageIcon, FileTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FC } from "react";
import { FaRegFilePdf } from "react-icons/fa";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/components/ui/utils";
import { useAttachmentSrc } from "@/hooks/use-attachments";
import type { Attachment } from "@assistant-ui/react";
import {
  AttachmentPrimitive,
  MessagePrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import { AttachmentPreviewDialog } from "./attachment-preview";

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
      <FaRegFilePdf className="aui-attachment-tile-fallback-icon size-8 text-muted-foreground" />
    );
  }
  if (!type.startsWith("image/")) {
    return (
      <FileTextIcon className="aui-attachment-tile-fallback-icon size-8 text-muted-foreground" />
    );
  }

  return (
    <Avatar className="aui-attachment-tile-avatar h-full w-full rounded-none">
      <AvatarImage
        src={src}
        alt={altText}
        className="aui-attachment-tile-image object-cover"
      />
      <AvatarFallback delayMs={isImage ? 200 : 0}>
        <FileImageIcon className="aui-attachment-tile-fallback-icon size-8 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
};

export const AttachmentUI: FC = () => {
  const attachment = useAssistantState(({ attachment }) => attachment);
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

  return (
    <Tooltip>
      <AttachmentPreviewDialog attachment={attachment}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "aui-attachment-tile size-14 cursor-pointer overflow-hidden rounded-[14px] border bg-muted transition-opacity hover:opacity-75"
            )}
            role="button"
            id="attachment-tile"
            aria-label={ariaLabel}
          >
            <AttachmentThumb attachment={attachment} altText={altText} />
          </div>
        </TooltipTrigger>
      </AttachmentPreviewDialog>
      <TooltipContent side="top">
        <AttachmentPrimitive.Name />
      </TooltipContent>
    </Tooltip>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div className="aui-user-message-attachments-end col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2">
      <MessagePrimitive.Attachments components={{ Attachment: AttachmentUI }} />
    </div>
  );
};
