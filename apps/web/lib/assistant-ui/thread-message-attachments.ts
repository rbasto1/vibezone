import type {
  Attachment,
  TextMessagePart,
  ThreadMessage,
  ThreadMessageLike,
  ThreadUserMessagePart,
} from "@assistant-ui/react";
import {
  ATTACHMENT_TAG_REGEX,
  deriveUrlFromTextPart,
} from "./message-converters";

const deriveAttachmentFromTextPart = (
  part: TextMessagePart,
  messageId: string,
  index: number
): Attachment | null => {
  const url = deriveUrlFromTextPart(part);
  if (!url) return null;
  const match = part.text.match(ATTACHMENT_TAG_REGEX);
  const name = match?.[1] ?? `attachment-${index + 1}`;
  return {
    id: `${messageId}-text-${index}`,
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
  };
};

type AttachmentSource =
  | ThreadMessage
  | (ThreadMessageLike & { id?: string; metadata?: { custom?: unknown } });

export const deriveAttachmentsFromMessage = (
  message: AttachmentSource | undefined
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
    if (Array.isArray(attachments)) {
      const valid = attachments.filter(
        (item): item is Attachment =>
          !!item &&
          typeof item === "object" &&
          typeof (item as Attachment).id === "string" &&
          (item as Attachment).status?.type === "complete"
      );
      if (valid.length === attachments.length) {
        return valid;
      }
    }
  }

  const derived: Attachment[] = [];
  const contentArray =
    typeof message.content === "string"
      ? ([{ type: "text", text: message.content }] as ThreadUserMessagePart[])
      : Array.isArray(message.content)
        ? (message.content as ThreadUserMessagePart[])
        : ([message.content] as unknown as ThreadUserMessagePart[]);
  const messageId = message.id ?? "message";

  contentArray.forEach((part, index) => {
    if (part.type === "image") {
      derived.push({
        id: `${messageId}-image-${index}`,
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
        id: `${messageId}-file-${index}`,
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
      const attachment = deriveAttachmentFromTextPart(part, messageId, index);
      if (attachment) {
        derived.push(attachment);
      }
    }
  });

  return derived;
};
