import { useCallback, useRef } from "react";

import type { MessageMetadata } from "@/db/json-columns-types";
import { sanitizeAttachmentText } from "@/lib/attachments/storage";
import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { uploadFiles } from "@/lib/uploadthing/client";
import { useSavedMessages } from "@/store/saved-messages";
import type {
  FileMessagePart,
  ImageMessagePart,
  MessageState,
  TextMessagePart,
} from "@assistant-ui/react";
import type { UploadMeta } from "@/lib/attachments/storage";
import type { ClientUploadedFileData } from "uploadthing/types";

import { useCurrentChatValue } from "./use-chat";
import { useStableValue } from "./use-stable-value";

const ATTACHMENT_TAG_REGEX =
  /^<attachment name="([^"]+)">\n([\s\S]*)\n<\/attachment>$/;
const DATA_URL_REGEX = /^data:(?<mime>[^;]+);base64,(?<data>.+)$/;
const DEFAULT_IMAGE_NAME = "assistant-image.png";
const DEFAULT_FILE_NAME = "assistant-attachment";

interface UploadedFileInfo {
  url: string;
  contentType?: string;
  name?: string;
}

const dataUrlToFile = (dataUrl: string, fallbackName: string): File => {
  const match = DATA_URL_REGEX.exec(dataUrl);
  if (!match?.groups?.data) {
    throw new Error("Invalid data URL");
  }

  const mimeType = match.groups.mime || "application/octet-stream";
  const binary = atob(match.groups.data);
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const name =
    fallbackName ||
    (mimeType.startsWith("image/") ? DEFAULT_IMAGE_NAME : DEFAULT_FILE_NAME);
  return new File([bytes], name, { type: mimeType });
};

const uploadDataUrl = async (
  dataUrl: string,
  fallbackName: string
): Promise<UploadedFileInfo> => {
  const file = dataUrlToFile(dataUrl, fallbackName);
  const results = await uploadFiles("messageAttachment", { files: [file] });
  const uploaded = results?.[0] as ClientUploadedFileData<UploadMeta> | undefined;
  if (!uploaded) {
    throw new Error("Upload failed");
  }

  const url = uploaded.serverData?.fileUrl ?? uploaded.url;
  if (!url) {
    throw new Error("Upload URL missing");
  }

  return {
    url,
    contentType: uploaded.serverData?.contentType ?? file.type,
    name: uploaded.serverData?.name ?? uploaded.name ?? file.name,
  };
};

const sanitizeImagePart = async (part: ImageMessagePart) => {
  const source = part.image;
  if (typeof source !== "string" || !source.startsWith("data:")) {
    return part;
  }
  const uploaded = await uploadDataUrl(source, part.filename ?? DEFAULT_IMAGE_NAME);
  return {
    ...part,
    image: uploaded.url,
    filename: part.filename ?? uploaded.name,
  };
};

const sanitizeFilePart = async (part: FileMessagePart) => {
  const source = part.data;
  if (typeof source !== "string" || !source.startsWith("data:")) {
    return part;
  }
  const uploaded = await uploadDataUrl(source, part.filename ?? DEFAULT_FILE_NAME);
  return {
    ...part,
    data: uploaded.url,
    mimeType: part.mimeType ?? uploaded.contentType ?? "application/octet-stream",
    filename: part.filename ?? uploaded.name,
  };
};

const sanitizeTextPart = async (part: TextMessagePart) => {
  const match = part.text.match(ATTACHMENT_TAG_REGEX);
  if (!match) return part;

  const [, rawName, body] = match;
  const content = body?.trim() ?? "";
  if (!content.startsWith("data:")) return part;

  const uploaded = await uploadDataUrl(
    content,
    rawName || DEFAULT_FILE_NAME
  );

  return {
    ...part,
    text: sanitizeAttachmentText(part.text, uploaded.url),
  };
};

const sanitizeContent = async (parts: MessageState["content"]) => {
  const sanitized = await Promise.all(
    parts.map(async (part) => {
      switch (part.type) {
        case "image":
          return sanitizeImagePart(part);
        case "file":
          return sanitizeFilePart(part);
        case "text":
          return sanitizeTextPart(part);
        default:
          return part;
      }
    })
  );
  return sanitized as MessageState["content"];
};

export const useAssistantMessageSaver = () => {
  const user = useUser();
  const chat = useCurrentChatValue();
  const [savedMessages, appendSavedMessages] = useSavedMessages();
  const saveMessagesMutation = trpc.messages.saveMessages.useMutation();
  const saveMessagesMutationStable = useStableValue(saveMessagesMutation);
  const inFlightIds = useRef(new Set<string>());

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
      if (inFlightIds.current.has(message.id)) return;

      inFlightIds.current.add(message.id);

      const run = async () => {
        try {
          const content = Array.isArray(message.content)
            ? await sanitizeContent(message.content)
            : message.content;

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
                content,
                attachments: [],
                metadata: message.metadata as MessageMetadata,
                status: message.status,
                createdAt: message.createdAt,
              },
            ],
          };

          const saveMessages = saveMessagesMutationStable.current;
          await saveMessages.mutateAsync(
            // messages has read-only components, for now let's ignore the warning
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload as any,
            {
              onError: (error) => {
                console.error("Failed to save assistant message:", error);
              },
            }
          );

          appendSavedMessages(message.id);
        } catch (error) {
          console.error("Failed to save assistant message:", error);
        } finally {
          inFlightIds.current.delete(message.id);
        }
      };

      void run();
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
