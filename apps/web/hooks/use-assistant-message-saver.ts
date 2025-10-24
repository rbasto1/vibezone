import type { MessageMetadata } from "@/db/json-columns-types";
import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { useCallback } from "react";

import type {
  CompleteAttachment,
  FileMessagePart,
  ImageMessagePart,
  MessageState,
  TextMessagePart,
  ThreadMessage,
  ThreadUserMessagePart,
} from "@assistant-ui/react";

import { useSavedMessages } from "@/store/saved-messages";
import { useCurrentChatValue } from "./use-chat";
import { useStableValue } from "./use-stable-value";

const ATTACHMENT_TAG_REGEX =
  /^<attachment name="([^"]+)">\n([\s\S]*)\n<\/attachment>$/;

const ensureAttachmentArray = (msg: ThreadMessage): CompleteAttachment[] => {
  if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
    return msg.attachments as CompleteAttachment[];
  }

  const derived: CompleteAttachment[] = [];

  msg.content.forEach((part, index) => {
    if (part.type === "image") {
      const imagePart = part as ImageMessagePart;
      derived.push({
        id: `${msg.id}-image-${index}`,
        type: "image",
        name: imagePart.filename ?? `image-${index + 1}`,
        contentType: "image/png",
        status: { type: "complete" },
        content: [imagePart as ThreadUserMessagePart],
      });
      return;
    }

    if (part.type === "file") {
      const filePart = part as FileMessagePart;
      derived.push({
        id: `${msg.id}-file-${index}`,
        type: filePart.mimeType?.startsWith("image/")
          ? "image"
          : filePart.mimeType === "application/pdf"
            ? "document"
            : "file",
        name: filePart.filename ?? `file-${index + 1}`,
        contentType: filePart.mimeType ?? "application/octet-stream",
        status: { type: "complete" },
        content: [filePart as ThreadUserMessagePart],
      });
      return;
    }

    if (part.type === "text") {
      const textPart = part as TextMessagePart;
      const match = textPart.text.match(ATTACHMENT_TAG_REGEX);
      if (!match) return;
      const [, rawName, body] = match;
      const content = body?.trim();
      const name = rawName;

      if (content?.startsWith("http")) {
        derived.push({
          id: `${msg.id}-link-${index}`,
          type: "document",
          name: name || `attachment-${index + 1}`,
          contentType: "application/octet-stream",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              data: content,
              filename: name || `attachment-${index + 1}`,
              mimeType: "application/octet-stream",
            } as ThreadUserMessagePart,
          ],
        });
      }
    }
  });

  return derived;
};

export const useAssistantMessageSaver = () => {
  const user = useUser();
  const chat = useCurrentChatValue();
  const [savedMessages, appendSavedMessages] = useSavedMessages();
  const saveMessagesMutation = trpc.messages.saveMessages.useMutation();
  const saveMessagesMutationStable = useStableValue(saveMessagesMutation);

  const isLoggedIn = !!user;
  const chatId = chat.id;
  const projectId = chat.projectId;

  return useCallback(
    (message: MessageState, threadId: string, modelId: string) => {
      if (!isLoggedIn || !projectId) return;
      if (message.id.startsWith("__optimistic__")) return;
      if (message.role !== "assistant") return;
      if (message.status?.type === "running") return;
      if (savedMessages.has(message.id)) return;

      appendSavedMessages(message.id);

      const payload = {
        chatId,
        projectId,
        threadId,
        modelId,
        messages: [
          {
            id: message.id,
            parentId: message.parentId,
            branchNumber: message.branchNumber,
            role: message.role,
            content: message.content,
            attachments: ensureAttachmentArray(
              message as unknown as ThreadMessage
            ),
            metadata: message.metadata as MessageMetadata,
            status: message.status,
            createdAt: message.createdAt,
          },
        ],
      };

      const saveMessages = saveMessagesMutationStable.current;
      void saveMessages
        .mutateAsync(
          // messages has read-only components, for now let's ignore the warning
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload as any,
          {
            onError: (error) => {
              console.error("Failed to save assistant message:", error);
            },
          }
        )
        .catch((error) => {
          console.error("Failed to save assistant message:", error);
        });
    },
    [
      appendSavedMessages,
      chatId,
      isLoggedIn,
      projectId,
      saveMessagesMutationStable,
      savedMessages,
    ]
  );
};
