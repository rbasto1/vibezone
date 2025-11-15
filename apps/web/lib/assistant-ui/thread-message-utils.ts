import type {
  CreateAppendMessage,
  ThreadMessageLike,
} from "@assistant-ui/react";
import { generateId } from "ai";

import { deriveAttachmentsFromMessage } from "./thread-message-attachments";

type ArrayContent = Extract<ThreadMessageLike["content"], readonly unknown[]>;
type ThreadContentPart = ArrayContent extends readonly (infer PART)[]
  ? PART
  : never;

const toContentArray = (message: ThreadMessageLike): ThreadContentPart[] => {
  if (Array.isArray(message.content)) {
    return message.content as ThreadContentPart[];
  }

  const text =
    typeof message.content === "string"
      ? message.content
      : ((message.content as { text?: string })?.text ?? "");

  return [
    {
      type: "text",
      text,
    } as ThreadContentPart,
  ];
};

export const createAppendFromThreadMessage = (
  message: ThreadMessageLike
): CreateAppendMessage => {
  const metadata = message.metadata ?? { custom: {} };
  return {
    role: "user",
    content: toContentArray(message),
    attachments: deriveAttachmentsFromMessage(message),
    metadata: {
      ...metadata,
      custom: {
        ...(metadata.custom ?? {}),
      },
    },
    createdAt: message.createdAt ?? new Date(),
  } as CreateAppendMessage;
};

export interface PersistableThreadMessage {
  id: string;
  parentId: string | null;
  branchNumber?: number;
  role: ThreadMessageLike["role"];
  content: ThreadContentPart[];
  attachments?: ThreadMessageLike["attachments"];
  metadata: ThreadMessageLike["metadata"] & { custom: Record<string, unknown> };
  status?: ThreadMessageLike["status"];
  createdAt?: Date;
}

export const toPersistableThreadMessages = (
  messages: ThreadMessageLike[]
): PersistableThreadMessage[] => {
  let previousId: string | null = null;
  return messages.map((message) => {
    const id = generateId();
    const metadata = message.metadata ?? { custom: {} };

    const persistable: PersistableThreadMessage = {
      id,
      parentId: previousId,
      role: message.role,
      content: toContentArray(message),
      attachments: message.attachments ?? [],
      metadata: {
        ...metadata,
        custom: {
          ...(metadata.custom ?? {}),
          saved: true,
        },
      },
      status: message.status,
      createdAt: message.createdAt ?? new Date(),
    };

    previousId = id;
    return persistable;
  });
};
