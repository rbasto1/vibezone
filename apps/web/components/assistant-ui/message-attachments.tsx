"use client";

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
import { FileText } from "lucide-react";
import { type FC } from "react";
import { AttachmentPreviewDialog } from "./attachment-preview";

interface AttachmentThumbProps {
  attachment: Attachment;
}

const AttachmentThumb: FC<AttachmentThumbProps> = ({ attachment }) => {
  const isImage = attachment.type === "image";
  const src = useAttachmentSrc(attachment);

  return (
    <Avatar className="aui-attachment-tile-avatar h-full w-full rounded-none">
      <AvatarImage
        src={src}
        alt="Attachment preview"
        className="aui-attachment-tile-image object-cover"
      />
      <AvatarFallback delayMs={isImage ? 200 : 0}>
        <FileText className="aui-attachment-tile-fallback-icon size-8 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
};

export const AttachmentUI: FC = () => {
  const attachment = useAssistantState(({ attachment }) => attachment);

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
            aria-label={`${typeLabel(attachment)} attachment`}
          >
            <AttachmentThumb attachment={attachment} />
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

const typeLabel = ({ type }: Attachment) => {
  switch (type) {
    case "image":
      return "Image";
    case "document":
      return "Document";
    case "file":
      return "File";
    default:
      throw new Error(`Unknown attachment type: ${type}`);
  }
};
