import {
  generateId,
  type CreateUIMessage,
  type UIDataTypes,
  type UIMessage,
  type UIMessagePart,
  type UITools,
} from "ai";

import type { Message } from "@/db";
import type { MessageMetadata } from "@/db/json-columns-types";
import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";

const toTextPart = (text: string) => ({ type: "text" as const, text });

const convertUIPartToThreadPart = (
  part: UIMessagePart<UIDataTypes, UITools>
): ThreadMessageLike["content"][number] | null => {
  switch (part.type) {
    case "text":
    case "reasoning":
      return {
        type: part.type,
        text: part.text,
      } as ThreadMessageLike["content"][number];
    case "file": {
      const mediaType = part.mediaType ?? "application/octet-stream";
      if (part.url && mediaType.startsWith("image/")) {
        return {
          type: "image",
          image: part.url,
          filename: part.filename ?? "image",
        } as ThreadMessageLike["content"][number];
      }
      if (!part.url) return null;
      return {
        type: "file",
        data: part.url,
        mimeType: mediaType,
        filename: part.filename ?? "attachment",
      } as ThreadMessageLike["content"][number];
    }
    default:
      return null;
  }
};

const convertThreadPartToUIPart = (
  part: ThreadMessageLike["content"][number]
): UIMessagePart<UIDataTypes, UITools> => {
  if (!part || typeof part !== "object" || !("type" in part)) {
    return toTextPart("") as UIMessagePart<UIDataTypes, UITools>;
  }

  switch ((part as { type: string }).type) {
    case "text":
      return { type: "text", text: (part as { text: string }).text };
    case "image":
      return {
        type: "file",
        url: (part as { image: string }).image,
        mediaType: "image/png",
        filename: (part as { filename?: string }).filename,
      } as UIMessagePart<UIDataTypes, UITools>;
    case "file":
      return {
        type: "file",
        url: (part as { data: string }).data,
        mediaType: (part as { mimeType: string }).mimeType,
        filename: (part as { filename?: string }).filename,
      } as UIMessagePart<UIDataTypes, UITools>;
    default:
      return toTextPart(
        (part as { text?: string }).text ?? ""
      ) as UIMessagePart<UIDataTypes, UITools>;
  }
};

export const toThreadMessages = (
  uiMessages: readonly UIMessage[]
): ThreadMessageLike[] => {
  return uiMessages.map((message) => {
    const converted = message.parts
      ?.map(convertUIPartToThreadPart)
      .filter(Boolean) as ThreadMessageLike["content"] | undefined;

    const metadata = message.metadata as MessageMetadata | undefined;

    return {
      id: message.id,
      role: message.role,
      createdAt: new Date(),
      content: converted && converted.length ? converted : [toTextPart("")],
      ...(metadata
        ? {
            metadata: {
              ...metadata,
              custom: metadata.custom ?? {},
            },
          }
        : { metadata: { custom: {} } }),
    } as ThreadMessageLike;
  });
};

export const toUiMessages = (
  threadMessages: readonly ThreadMessageLike[]
): UIMessage[] => {
  return threadMessages.map((message) => {
    const parts = Array.isArray(message.content)
      ? message.content.map(convertThreadPartToUIPart)
      : [
          toTextPart(String(message.content ?? "")) as UIMessagePart<
            UIDataTypes,
            UITools
          >,
        ];

    return {
      id: message.id ?? generateId(),
      role: message.role,
      parts,
      ...(message.metadata
        ? { metadata: message.metadata as Record<string, unknown> }
        : {}),
    } satisfies UIMessage;
  });
};

export const createMessageFromAppend = (
  message: AppendMessage
): CreateUIMessage<UIMessage> => {
  const inline = message.content
    .filter((part) => part.type === "text")
    .map((part) => ({ type: "text" as const, text: part.text }));

  const attachmentParts = (message.attachments ?? [])
    .flatMap((attachment) =>
      attachment.content.map((contentPart) => {
        switch (contentPart.type) {
          case "text":
            return { type: "text" as const, text: contentPart.text };
          case "image":
            return contentPart.image
              ? {
                  type: "file" as const,
                  url: contentPart.image,
                  mediaType: "image/png",
                  filename:
                    contentPart.filename ?? attachment.name ?? "attachment",
                }
              : null;
          case "file":
            return contentPart.data
              ? {
                  type: "file" as const,
                  url: contentPart.data,
                  mediaType: contentPart.mimeType ?? "application/octet-stream",
                  filename:
                    contentPart.filename ?? attachment.name ?? "attachment",
                }
              : null;
          default:
            return null;
        }
      })
    )
    .filter(Boolean) as UIMessagePart<UIDataTypes, UITools>[];

  const parts = [...inline, ...attachmentParts] as UIMessagePart<
    UIDataTypes,
    UITools
  >[];

  return {
    id: generateId(),
    role: message.role,
    parts,
  } satisfies CreateUIMessage<UIMessage>;
};

export const sliceUiMessagesUntil = <UI_MESSAGE extends UIMessage = UIMessage>(
  messages: UI_MESSAGE[],
  messageId: string | null
) => {
  if (messageId == null) return [] as UI_MESSAGE[];

  let messageIdx = messages.findIndex((m) => m.id === messageId);
  if (messageIdx === -1)
    throw new Error("Message not found when slicing UI messages.");

  while (messages[messageIdx + 1]?.role === "assistant") {
    messageIdx++;
  }

  return messages.slice(0, messageIdx + 1);
};

// Helper function to convert database messages to ThreadMessageLike format
export const toThreadMessageLike = (msg: Message): ThreadMessageLike => {
  const role = (msg.role ?? "system") as "user" | "assistant" | "system";

  const contentArrayRaw = Array.isArray(msg.content)
    ? (msg.content
        .map(convertContentPart)
        .filter(
          (part): part is ThreadMessageLike["content"][number] => part !== null
        ) as ThreadMessageLike["content"])
    : ([
        { type: "text", text: String(msg.content ?? "") },
      ] as ThreadMessageLike["content"]);

  const contentArray =
    contentArrayRaw.length > 0
      ? contentArrayRaw
      : ([{ type: "text", text: "" }] as ThreadMessageLike["content"]);

  const status = role === "assistant" ? convertStatus(msg.status) : undefined;

  const threadMessage: ThreadMessageLike = {
    id: msg.id,
    role,
    content: contentArray,
    attachments: Array.isArray(msg.attachments)
      ? (msg.attachments as ThreadMessageLike["attachments"])
      : undefined,
    metadata: msg.metadata?.custom
      ? { custom: msg.metadata.custom }
      : undefined,
    createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
    ...(status ? { status } : {}),
  };

  return threadMessage;
};

const convertContentPart = (
  part: unknown
): ThreadMessageLike["content"][number] | null => {
  const candidate = part as Record<string, unknown>;
  switch (candidate?.type) {
    case "text":
      return {
        type: "text",
        text: typeof candidate.text === "string" ? candidate.text : "",
      };
    case "image":
      if (
        typeof candidate.image !== "string" &&
        typeof candidate.url !== "string"
      ) {
        return null;
      }
      return {
        type: "file",
        data:
          typeof candidate.image === "string"
            ? candidate.image
            : String(candidate.url ?? ""),
        mimeType: "image/png",
        filename:
          typeof candidate.filename === "string" ? candidate.filename : "image",
      } as ThreadMessageLike["content"][number];
    case "file":
      if (typeof candidate.url !== "string") {
        return null;
      }
      return {
        type: "file",
        data: candidate.url,
        mimeType:
          typeof candidate.mediaType === "string"
            ? candidate.mediaType
            : "application/octet-stream",
        filename:
          typeof candidate.filename === "string"
            ? candidate.filename
            : "attachment",
      } as ThreadMessageLike["content"][number];
    default:
      return null;
  }
};

const convertStatus = (
  status: Message["status"]
): ThreadMessageLike["status"] => {
  if (!status?.type) return undefined;
  switch (status.type) {
    case "running":
      return { type: "running" };
    case "requires-action":
      if (status.reason === "tool-calls") {
        return { type: "requires-action", reason: "tool-calls" };
      }
      return undefined;
    case "complete":
      return {
        type: "complete",
        reason:
          status.reason === "stop" || status.reason === "unknown"
            ? status.reason
            : "unknown",
      };
    case "incomplete":
      return {
        type: "incomplete",
        reason:
          status.reason === "cancelled" ||
          status.reason === "tool-calls" ||
          status.reason === "length" ||
          status.reason === "content-filter" ||
          status.reason === "other" ||
          status.reason === "error"
            ? status.reason
            : "other",
      };
    default:
      return undefined;
  }
};
