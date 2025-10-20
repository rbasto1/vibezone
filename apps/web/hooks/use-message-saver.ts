import { useEffect, useRef } from "react";

import type { MessageMetadata } from "@/db/json-columns-types";
import {
  base64ToFile,
  buildSerializableAttachment,
  dataUrlToFile,
  guessMimeTypeFromFilename,
  isRemoteUrl,
  parseAttachmentTag,
  sanitizeAttachmentText,
  textToFile,
  type SerializableAttachment,
  type UploadMeta,
} from "@/lib/attachments/storage";
import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { uploadFiles } from "@/lib/uploadthing/client";
import type { PanelConfig } from "@/store/panels";
import type {
  FileMessagePart,
  ImageMessagePart,
  TextMessagePart,
  ThreadMessage,
  ThreadUserMessagePart,
} from "@assistant-ui/react";
import { useThread } from "@assistant-ui/react";
import type { ClientUploadedFileData } from "uploadthing/types";

import { useCurrentChat } from "./use-chat";
import { usePanelStateValue } from "./use-panels";

interface DebouncedSaveTimeout {
  timeout: ReturnType<typeof setTimeout> | null;
  lastSavedAt: number;
}

const DEBOUNCED_SAVE_TIMEOUT = 1000;

const toUploadMeta = (
  uploaded: ClientUploadedFileData<UploadMeta>,
  file: File
): UploadMeta | null => {
  const serverData = uploaded.serverData ?? null;
  const fileUrl = serverData?.fileUrl ?? uploaded.url ?? "";
  if (!fileUrl) return null;

  const fileKey = serverData?.fileKey ?? uploaded.key ?? "";
  const size = serverData?.size ?? uploaded.size ?? file.size;
  const contentType = serverData?.contentType ?? file.type;
  const name = serverData?.name ?? uploaded.name ?? file.name;

  return {
    fileUrl,
    fileKey,
    size,
    contentType,
    name,
    uploadedBy: serverData?.uploadedBy,
  };
};

const uploadSingleFile = async (file: File): Promise<UploadMeta | null> => {
  try {
    const results = await uploadFiles("messageAttachment", { files: [file] });
    const uploaded = results?.[0] as
      | ClientUploadedFileData<UploadMeta>
      | undefined;
    if (!uploaded) return null;
    return toUploadMeta(uploaded, file);
  } catch (error) {
    console.error("Failed to upload attachment:", error);
    return null;
  }
};

const buildImageAttachment = async (
  part: ImageMessagePart
): Promise<{
  part: ImageMessagePart;
  attachment?: SerializableAttachment;
}> => {
  if (!part.image) {
    return { part };
  }

  if (isRemoteUrl(part.image)) {
    const name = part.filename ?? "image";
    const contentType = guessMimeTypeFromFilename(name, "image/png");
    const attachment = buildSerializableAttachment({
      type: "image",
      name,
      contentType,
      remoteUrl: part.image,
      content: [
        {
          type: "image",
          image: part.image,
          filename: name,
        },
      ] satisfies ThreadUserMessagePart[],
    });

    return { part, attachment };
  }

  const file = dataUrlToFile(part.image, part.filename ?? "image", "image/png");
  if (!file) {
    return { part };
  }

  const meta = await uploadSingleFile(file);
  if (!meta?.fileUrl) {
    return { part };
  }

  const resolvedName = meta.name ?? part.filename ?? file.name ?? "image";
  const contentType =
    meta.contentType ??
    file.type ??
    guessMimeTypeFromFilename(resolvedName, "image/png");
  const remoteUrl = meta.fileUrl;

  const attachment = buildSerializableAttachment({
    type: "image",
    name: resolvedName,
    contentType,
    remoteUrl,
    content: [
      {
        type: "image",
        image: remoteUrl,
        filename: resolvedName,
      },
    ] satisfies ThreadUserMessagePart[],
    meta,
  });

  const updatedPart: ImageMessagePart = {
    ...part,
    image: remoteUrl,
    filename: resolvedName,
  };

  return { part: updatedPart, attachment };
};

const buildFileAttachment = async (
  part: FileMessagePart
): Promise<{
  part: FileMessagePart;
  attachment?: SerializableAttachment;
}> => {
  if (!part.data) {
    return { part };
  }

  const filename = part.filename ?? "attachment";
  const fallbackMime = guessMimeTypeFromFilename(
    filename,
    part.mimeType ?? "application/octet-stream"
  );

  if (isRemoteUrl(part.data)) {
    const attachment = buildSerializableAttachment({
      type: "document",
      name: filename,
      contentType: part.mimeType ?? fallbackMime,
      remoteUrl: part.data,
      content: [
        {
          type: "file",
          data: part.data,
          filename,
          mimeType: part.mimeType ?? fallbackMime,
        },
      ] satisfies ThreadUserMessagePart[],
    });

    return { part, attachment };
  }

  const fileSource = part.data;
  const file = fileSource.startsWith("data:")
    ? dataUrlToFile(fileSource, filename, fallbackMime)
    : base64ToFile(fileSource, filename, part.mimeType ?? fallbackMime);

  if (!file) {
    return { part };
  }

  const meta = await uploadSingleFile(file);
  if (!meta?.fileUrl) {
    return { part };
  }

  const remoteUrl = meta.fileUrl;
  const resolvedMime =
    meta.contentType ?? part.mimeType ?? file.type ?? fallbackMime;

  const attachment = buildSerializableAttachment({
    type: "document",
    name: filename,
    contentType: resolvedMime,
    remoteUrl,
    content: [
      {
        type: "file",
        data: remoteUrl,
        filename,
        mimeType: resolvedMime,
      },
    ] satisfies ThreadUserMessagePart[],
    meta,
  });

  const updatedPart: FileMessagePart = {
    ...part,
    data: remoteUrl,
    mimeType: resolvedMime,
  };

  return { part: updatedPart, attachment };
};

const buildTextAttachment = async (
  part: TextMessagePart
): Promise<{
  part: TextMessagePart;
  attachment?: SerializableAttachment;
}> => {
  const parsed = parseAttachmentTag(part.text);
  if (!parsed) {
    return { part };
  }

  const { name, content } = parsed;
  const trimmedContent = content.trim();
  const fallbackMime = guessMimeTypeFromFilename(name, "text/plain");

  if (isRemoteUrl(trimmedContent)) {
    const sanitizedText = sanitizeAttachmentText(
      part.text,
      name,
      trimmedContent
    );
    const attachment = buildSerializableAttachment({
      type: "document",
      name,
      contentType: fallbackMime,
      remoteUrl: trimmedContent,
      content: [
        {
          type: "text",
          text: sanitizedText,
        },
      ] satisfies ThreadUserMessagePart[],
    });

    return {
      part: {
        ...part,
        text: sanitizedText,
      },
      attachment,
    };
  }

  const file = textToFile(content, name, fallbackMime);
  const meta = await uploadSingleFile(file);
  if (!meta?.fileUrl) {
    return { part };
  }

  const remoteUrl = meta.fileUrl;
  const resolvedMime = meta.contentType ?? fallbackMime;
  const sanitizedText = sanitizeAttachmentText(part.text, name, remoteUrl);

  const attachment = buildSerializableAttachment({
    type: "document",
    name,
    contentType: resolvedMime,
    remoteUrl,
    content: [
      {
        type: "text",
        text: sanitizedText,
      },
    ] satisfies ThreadUserMessagePart[],
    meta,
  });

  return {
    part: {
      ...part,
      text: sanitizedText,
    },
    attachment,
  };
};

type Mutable<Type> = {
  -readonly [Key in keyof Type]: Type[Key];
};

const processMessageContent = async (msg: ThreadMessage) => {
  const attachments: SerializableAttachment[] = [];
  const updatedContent: Mutable<ThreadMessage["content"]> = [];

  for (const part of msg.content) {
    if (part.type === "image") {
      const { part: nextPart, attachment } = await buildImageAttachment(part);
      updatedContent.push(nextPart);
      if (attachment) attachments.push(attachment);
      continue;
    }
    if (part.type === "file") {
      const { part: nextPart, attachment } = await buildFileAttachment(part);
      updatedContent.push(nextPart);
      if (attachment) attachments.push(attachment);
      continue;
    }
    if (part.type === "text") {
      const { part: nextPart, attachment } = await buildTextAttachment(part);
      updatedContent.push(nextPart);
      if (attachment) attachments.push(attachment);
      continue;
    }
    updatedContent.push(part);
  }

  return {
    content: updatedContent,
    attachments,
  };
};

const prepareMessageForSave = async (msg: ThreadMessage) => {
  const { content, attachments } = await processMessageContent(msg);
  return {
    id: msg.id,
    role: msg.role,
    content,
    attachments,
    metadata: (msg.metadata ?? undefined) as MessageMetadata | undefined,
    status: msg.status,
    createdAt: msg.createdAt,
  };
};

export const useMessageSaver = (panel: PanelConfig) => {
  const { id, model, initialMessages } = panel;

  // Remote states
  const [currentChat, setCurrentChat] = useCurrentChat();
  const thread = useThread();
  const utils = trpc.useUtils();
  const user = useUser();
  const panelState = usePanelStateValue(id);

  // Local states
  const debouncedSaveTimeout = useRef<DebouncedSaveTimeout>({
    timeout: null,
    lastSavedAt: Date.now(),
  });
  const saveMessagesMutation = trpc.messages.saveMessages.useMutation({
    onSuccess: () => {
      void utils.chats.listChats.invalidate();
    },
  });
  const savedMessageIds = useRef(
    new Set<string>(
      (initialMessages ?? [])
        .map((msg) => msg.id)
        .filter((messageId): messageId is string => Boolean(messageId))
    )
  );
  const userId = user?.id;
  const messages = thread.messages;
  const isDirty = panelState.dirty;
  const chatId = currentChat.id;

  // Watch for messages and save ones that are ready and not yet saved
  useEffect(() => {
    if (!isDirty) return;
    if (debouncedSaveTimeout.current.timeout) return; // there is a save queued
    save();

    function save() {
      if (
        debouncedSaveTimeout.current.lastSavedAt >
        Date.now() - DEBOUNCED_SAVE_TIMEOUT
      ) {
        debouncedSaveTimeout.current.timeout = setTimeout(
          save,
          DEBOUNCED_SAVE_TIMEOUT
        );
        return;
      }
      debouncedSaveTimeout.current.lastSavedAt = Date.now();
      debouncedSaveTimeout.current.timeout = null;

      // Determine which messages are ready to be saved
      const shouldSave = (msg: ThreadMessage) => {
        // Already saved
        if (savedMessageIds.current.has(msg.id)) return false;
        // Assistant messages only when not running
        if (msg.role === "assistant") {
          return msg.status?.type !== "running";
        }
        // User and other roles: save immediately
        return true;
      };

      // Collect and dedupe by id
      const toSaveMap = new Map<string, ThreadMessage>();
      for (const msg of messages) {
        if (shouldSave(msg)) {
          toSaveMap.set(msg.id, msg);
        }
      }
      const toSave = Array.from(toSaveMap.values());

      if (!toSave.length) return;

      // Mark as saved immediately to avoid duplicate saves on rapid renders
      toSave.forEach((m) => savedMessageIds.current.add(m.id));

      if (userId) {
        setCurrentChat((currentChat) => {
          if (currentChat.addedToList) return currentChat;

          void utils.chats.listChats.invalidate();

          return {
            ...currentChat,
            addedToList: true,
          };
        });
      }

      void Promise.all(
        toSave.map((msg) =>
          prepareMessageForSave(msg).catch((error) => {
            console.error("Failed to prepare message for save:", error);
            savedMessageIds.current.delete(msg.id);
            return null;
          })
        )
      )
        .then((prepared) =>
          prepared.filter(
            (msg): msg is Awaited<ReturnType<typeof prepareMessageForSave>> =>
              msg !== null
          )
        )
        .then((prepared) => {
          if (!prepared.length) return;
          if (!userId) return;
          return saveMessagesMutation
            .mutateAsync({
              chatId,
              threadId: id, // panelId is the same as threadId
              modelId: model,
              messages: prepared,
            })
            .catch((error) => {
              console.error("Failed to save messages:", error);
              // Keep ids marked as saved to avoid infinite retry loop
            });
        })
        .catch((error) => {
          console.error("Failed to process messages for saving:", error);
        })
        .finally(() => {
          setCurrentChat((currentChat) => ({
            ...currentChat,
            dirty: false,
          }));
        });
    }
  }, [
    chatId,
    id,
    isDirty,
    messages,
    model,
    userId,
    setCurrentChat,
    saveMessagesMutation,
    utils.chats.listChats,
  ]);

  return {
    isSaving: saveMessagesMutation.isPending,
    saveError: saveMessagesMutation.error,
  };
};
