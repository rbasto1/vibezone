import { eq, inArray, sql } from "drizzle-orm";
import JSZip from "jszip";
import { randomUUID } from "node:crypto";
import { UTApi } from "uploadthing/server";

import {
  chats,
  db,
  messages,
  projects,
  threads,
  type NewChat,
  type NewMessage,
  type NewThread,
} from "@/db";
import type { MessageMetadata } from "@/db/json-columns-types";
import { DEFAULT_PROJECT_COLOR } from "@/lib/constants";
import type {
  Conversation,
  ConversationNodeMessageContent,
} from "@/lib/openai/export-types";

interface ImportStreamOptions {
  userId: string;
  file: File;
}

type ProgressType = "progress" | "complete" | "error";

interface ImportProgressPayload {
  type: ProgressType;
  progress?: number;
  message: string;
}

interface AttachmentEntry {
  buffer: Buffer<ArrayBufferLike>;
  filename: string;
  mimeType: string;
}

interface UploadedAttachment {
  url: string;
  mimeType: string;
  filename: string;
  size: number;
}

interface PreparedConversationRecords {
  chat: NewChat;
  thread: NewThread;
  messages: NewMessage[];
}

const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer => {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(buffer);
  return arrayBuffer;
};

type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; filename?: string }
  | { type: "file"; data: string; mimeType: string; filename?: string };

type MessageContent = MessageContentPart[];

const openaiSlugToOpenRouterId: Record<string, string> = {
  "gpt-5": "openai/gpt-5",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4o": "openai/gpt-4o",
  "gpt-4": "openai/gpt-4",
  "gpt-4o-canmore": "openai/gpt-4o",
  "o4-mini": "openai/o4-mini",
  "gpt-5-thinking": "openai/gpt-5",
  "gpt-4-1": "openai/gpt-4.1",
};
const fallbackModelId = "openai/gpt-5";

const encoder = new TextEncoder();

export const createImportStream = ({ userId, file }: ImportStreamOptions) => {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (payload: ImportProgressPayload) => {
        const line = JSON.stringify(payload) + "\n";
        controller.enqueue(encoder.encode(line));
      };

      try {
        push({ type: "progress", progress: 2, message: "Validating archive" });

        if (!file.name.toLowerCase().endsWith(".zip")) {
          throw new Error("Only .zip archives are supported");
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const zip = await JSZip.loadAsync(fileBuffer);

        push({ type: "progress", progress: 6, message: "Reading archive" });

        const conversationsEntry = zip.file("conversations.json");
        if (!conversationsEntry || conversationsEntry.dir) {
          throw new Error("conversations.json not found in archive");
        }

        const conversationsJson = await conversationsEntry.async("string");
        const conversations: Conversation[] = JSON.parse(conversationsJson);

        const attachmentEntries = zip
          .file(/(^|\/)file-[^/]+$/)
          .filter((entry) => !entry.dir);

        const attachments = new Map<string, AttachmentEntry>();
        for (const entry of attachmentEntries) {
          const resolved = resolveAttachmentPointer(entry.name);
          if (!resolved) continue;
          if (attachments.has(resolved.pointer)) continue;
          const buffer = (await entry.async("nodebuffer")) as Buffer;
          const detectedMime = determineMimeFromFilename(resolved.filename);
          const sanitizedName = sanitizeFileName(
            resolved.filename || `${resolved.pointer}.bin`
          );
          const record: AttachmentEntry = {
            buffer,
            filename: sanitizedName,
            mimeType: detectedMime,
          };
          attachments.set(resolved.pointer, record);
          const alternate = resolved.pointer.includes("-")
            ? resolved.pointer.replace(/-/g, "_")
            : resolved.pointer.replace(/_/g, "-");
          if (!attachments.has(alternate)) {
            attachments.set(alternate, record);
          }
        }

        push({
          type: "progress",
          progress: 9,
          message: "Preparing import",
        });

        await importConversations({
          userId,
          conversations,
          attachments,
          push,
        });

        push({ type: "complete", progress: 100, message: "Import complete" });
      } catch (error) {
        console.error(
          `[data-import] Failed to import archive for ${userId}:`,
          error
        );
        push({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unexpected error while importing archive",
        });
      } finally {
        controller.close();
      }
    },
  });
};

async function convertConversationContent({
  content,
  metadata,
  attachments,
  uploadedAttachments,
  utapi,
}: {
  content: ConversationNodeMessageContent;
  metadata: Record<string, unknown>;
  attachments: Map<string, AttachmentEntry>;
  uploadedAttachments: Map<string, UploadedAttachment | null>;
  utapi: UTApi;
}): Promise<{ parts: MessageContent; metadata: Record<string, unknown> }> {
  const parts: MessageContent = [];
  const pointerPartAdded = new Set<string>();
  const pointerMetadata = new Map<string, Record<string, unknown>>();
  const fallbackMetadata: Array<Record<string, unknown>> = [];

  const appendText = (text: string | undefined | null) => {
    if (!text) return;
    const trimmed = typeof text === "string" ? text : "";
    if (!trimmed.length) return;
    parts.push({ type: "text", text: trimmed });
  };

  const ensureMetadataRecord = (
    pointer: string,
    uploaded: UploadedAttachment,
    overrideName?: string,
    overrideMime?: string,
    baseMetadata?: Record<string, unknown>
  ) => {
    const existing = pointerMetadata.get(pointer) ?? {};
    const record = {
      ...existing,
      ...(baseMetadata ? { ...baseMetadata } : {}),
    };

    record["id"] =
      typeof record["id"] === "string" && record["id"] ? record["id"] : pointer;
    record["name"] =
      typeof record["name"] === "string" && record["name"]
        ? record["name"]
        : (overrideName ?? uploaded.filename);
    record["mime_type"] =
      typeof record["mime_type"] === "string" && record["mime_type"]
        ? record["mime_type"]
        : (overrideMime ?? uploaded.mimeType);
    const sizeValue = record["size"];
    const resolvedSize =
      typeof sizeValue === "number" && Number.isFinite(sizeValue)
        ? sizeValue
        : uploaded.size;
    record["size"] = resolvedSize;
    record["source"] =
      typeof record["source"] === "string" && record["source"]
        ? record["source"]
        : "local";
    const fileTokenSize = record["file_token_size"];
    record["file_token_size"] =
      typeof fileTokenSize === "number" && Number.isFinite(fileTokenSize)
        ? fileTokenSize
        : Math.max(1, Math.round(resolvedSize / 4));

    pointerMetadata.set(pointer, record);
  };

  const processAttachment = async (
    pointer: string,
    options?: {
      overrideName?: string;
      overrideMime?: string;
      baseMetadata?: Record<string, unknown>;
      emitPart?: boolean;
      forcePartType?: "image" | "file";
      addMetadata?: boolean;
    }
  ) => {
    if (!pointer) return;
    const uploaded = await ensureAttachmentUploaded({
      pointer,
      attachments,
      uploadedAttachments,
      utapi,
    });

    if (!uploaded) {
      if (options?.baseMetadata) {
        fallbackMetadata.push({ ...options.baseMetadata });
      }
      return;
    }

    const partType =
      options?.forcePartType ??
      (uploaded.mimeType.startsWith("image/") ? "image" : "file");

    const shouldEmit = options?.emitPart ?? true;
    if (shouldEmit && !pointerPartAdded.has(pointer)) {
      pointerPartAdded.add(pointer);
      if (partType === "image") {
        parts.push({
          type: "image",
          image: uploaded.url,
          filename: options?.overrideName ?? uploaded.filename,
        });
      } else {
        parts.push({
          type: "file",
          data: uploaded.url,
          mimeType: options?.overrideMime ?? uploaded.mimeType,
          filename: options?.overrideName ?? uploaded.filename,
        });
      }
    }

    const shouldAddMetadata =
      options?.addMetadata ??
      (partType !== "image" || Boolean(options?.baseMetadata));

    if (shouldAddMetadata) {
      ensureMetadataRecord(
        pointer,
        uploaded,
        options?.overrideName,
        options?.overrideMime,
        options?.baseMetadata
      );
    }
  };

  if (!content) {
    // Still allow metadata attachments to populate below.
  } else if (content.content_type === "text") {
    for (const part of content.parts ?? []) {
      if (typeof part === "string") {
        appendText(part);
      }
    }
  } else if (content.content_type === "multimodal_text") {
    for (const part of content.parts ?? []) {
      if (typeof part === "string") {
        appendText(part);
        continue;
      }

      if (!part || typeof part !== "object") continue;
      const partType = String(
        (part as { content_type?: unknown }).content_type ?? ""
      );

      if (partType === "audio_transcription") {
        const transcriptionText = (part as { text?: unknown }).text;
        if (typeof transcriptionText === "string") {
          appendText(transcriptionText);
        }
        continue;
      }

      const pointer = getAssetPointer(part);
      if (!pointer) continue;
      const overrideName =
        typeof (part as { filename?: unknown }).filename === "string"
          ? ((part as { filename?: unknown }).filename as string)
          : undefined;
      const overrideMime =
        typeof (part as { mime_type?: unknown }).mime_type === "string"
          ? ((part as { mime_type?: unknown }).mime_type as string)
          : undefined;
      await processAttachment(pointer, {
        overrideName,
        overrideMime,
        forcePartType: partType.includes("image") ? "image" : undefined,
        addMetadata: !partType.includes("image"),
      });
    }
  } else if (content.content_type === "code") {
    appendText(content.text);
  } else if (content.content_type === "execution_output") {
    appendText(content.text);
  } else if (content.content_type === "tether_quote") {
    const payload = [
      content.title,
      content.text,
      content.url ? `Source: ${content.url}` : undefined,
    ]
      .filter(Boolean)
      .join("\n\n");
    appendText(payload);
  } else if (content.content_type === "system_error") {
    const payload = [content.name, content.text].filter(Boolean).join("\n\n");
    appendText(payload);
  } else if (content.content_type === "reasoning_recap") {
    appendText(content.content);
  } else if (content.content_type === "user_editable_context") {
    const payload = [
      content.user_profile ? `Profile:\n${content.user_profile}` : undefined,
      content.user_instructions
        ? `Instructions:\n${content.user_instructions}`
        : undefined,
    ]
      .filter(Boolean)
      .join("\n\n");
    appendText(payload);
  } else if (content.content_type === "thoughts") {
    for (const thought of content.thoughts ?? []) {
      if (!thought) continue;
      const text = [thought.summary, thought.content, ...thought.chunks]
        .filter(Boolean)
        .join("\n\n");
      appendText(text);
    }
  } else if (content.content_type === "tether_browsing_display") {
    const payload = [
      content.summary ? `Summary:\n${content.summary}` : undefined,
      content.result ? `Result:\n${content.result}` : undefined,
    ]
      .filter(Boolean)
      .join("\n\n");
    appendText(payload);
  } else {
    appendText(
      typeof content === "object" ? JSON.stringify(content) : String(content)
    );
  }

  const metadataAttachments = Array.isArray(
    (metadata as { attachments?: unknown })?.attachments
  )
    ? [
        ...((metadata as { attachments?: unknown }).attachments as Array<
          Record<string, unknown>
        >),
      ]
    : [];

  for (const entry of metadataAttachments) {
    if (!entry || typeof entry !== "object") continue;
    const pointerValue = entry["id"];
    const pointer =
      typeof pointerValue === "string" && pointerValue.length
        ? pointerValue
        : undefined;
    if (!pointer) continue;

    const preferredName =
      typeof entry["name"] === "string" && entry["name"].length
        ? (entry["name"] as string)
        : undefined;
    const preferredMime =
      typeof entry["mime_type"] === "string" && entry["mime_type"].length
        ? (entry["mime_type"] as string)
        : undefined;

    await processAttachment(pointer, {
      overrideName: preferredName,
      overrideMime: preferredMime,
      baseMetadata: { ...entry },
      addMetadata: true,
    });
  }

  const metadataCopy: Record<string, unknown> =
    metadata && typeof metadata === "object" && metadata !== null
      ? { ...metadata }
      : {};

  const existingAttachments = Array.isArray(metadataCopy["attachments"])
    ? [
        ...((metadataCopy["attachments"] as Array<Record<string, unknown>>) ??
          []),
      ]
    : [];

  const attachmentById = new Map<string, Record<string, unknown>>();
  for (const entry of existingAttachments) {
    if (!entry || typeof entry !== "object") continue;
    const idValue = entry["id"];
    if (typeof idValue === "string" && idValue.length) {
      attachmentById.set(idValue, { ...entry });
    } else {
      fallbackMetadata.push({ ...entry });
    }
  }

  for (const [pointer, record] of pointerMetadata.entries()) {
    attachmentById.set(pointer, { ...record });
  }

  for (const entry of fallbackMetadata) {
    if (!entry || typeof entry !== "object") continue;
    const idValue = entry["id"];
    if (typeof idValue === "string" && idValue.length) {
      if (!attachmentById.has(idValue)) {
        attachmentById.set(idValue, { ...entry });
      }
    } else {
      const generatedId = `missing-${randomUUID()}`;
      attachmentById.set(generatedId, { ...entry, id: generatedId });
    }
  }

  if (attachmentById.size > 0) {
    metadataCopy["attachments"] = Array.from(attachmentById.values());
  } else {
    delete metadataCopy["attachments"];
  }

  const currentCustom =
    metadataCopy["custom"] && typeof metadataCopy["custom"] === "object"
      ? { ...(metadataCopy["custom"] as Record<string, unknown>) }
      : {};
  metadataCopy["custom"] = { ...currentCustom, imported: true };

  return { parts, metadata: metadataCopy };
}

async function ensureAttachmentUploaded({
  pointer,
  attachments,
  uploadedAttachments,
  utapi,
}: {
  pointer: string;
  attachments: Map<string, AttachmentEntry>;
  uploadedAttachments: Map<string, UploadedAttachment | null>;
  utapi: UTApi;
}): Promise<UploadedAttachment | null> {
  if (uploadedAttachments.has(pointer)) {
    return uploadedAttachments.get(pointer) ?? null;
  }

  let attachment = attachments.get(pointer);
  if (!attachment) {
    const alternate = pointer.includes("-")
      ? pointer.replace(/-/g, "_")
      : pointer.replace(/_/g, "-");
    attachment = attachments.get(alternate);
  }
  if (!attachment) {
    console.warn(`[data-import] Missing attachment for pointer ${pointer}`);
    uploadedAttachments.set(pointer, null);
    return null;
  }

  const arrayBuffer = bufferToArrayBuffer(attachment.buffer);
  const file = new File([arrayBuffer], attachment.filename, {
    type: attachment.mimeType,
  });
  Object.assign(file, { customId: `imports/${randomUUID()}` });

  const uploadResult = await utapi.uploadFiles(file, {
    contentDisposition: "attachment",
  });

  if (!uploadResult || uploadResult.error || !uploadResult.data) {
    throw new Error(
      uploadResult?.error?.message ?? "Failed to upload attachment to storage"
    );
  }

  const uploaded: UploadedAttachment = {
    url: uploadResult.data.ufsUrl ?? uploadResult.data.url,
    mimeType: attachment.mimeType,
    filename: attachment.filename,
    size: attachment.buffer.length,
  };

  uploadedAttachments.set(pointer, uploaded);
  const alternatePointer = pointer.includes("-")
    ? pointer.replace(/-/g, "_")
    : pointer.replace(/_/g, "-");
  if (!uploadedAttachments.has(alternatePointer)) {
    uploadedAttachments.set(alternatePointer, uploaded);
  }
  return uploaded;
}

function getAssetPointer(part: unknown): string | null {
  if (!part || typeof part !== "object") return null;
  if ("asset" in (part as Record<string, unknown>)) {
    const asset = (part as { asset?: { asset_pointer?: unknown } }).asset;
    const pointer = asset?.asset_pointer;
    if (typeof pointer === "string" && pointer.length) {
      return pointer;
    }
  }
  if ("asset_pointer" in (part as Record<string, unknown>)) {
    const pointer = (part as { asset_pointer?: unknown }).asset_pointer;
    if (typeof pointer === "string" && pointer.length) {
      return pointer;
    }
  }
  return null;
}

async function ensureGeneralProject(userId: string) {
  const existing = await db.query.projects.findFirst({
    where: eq(projects.id, userId),
  });

  if (existing && !existing.deletedAt) {
    return existing.id;
  }

  const now = new Date();
  await db
    .insert(projects)
    .values({
      id: userId,
      userId,
      name: "General",
      color: DEFAULT_PROJECT_COLOR,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: projects.id,
      set: {
        name: "General",
        color: DEFAULT_PROJECT_COLOR,
        deletedAt: null,
        updatedAt: now,
      },
    });

  return userId;
}

function selectModelId(slug: string | null): string {
  if (!slug) return fallbackModelId;
  return openaiSlugToOpenRouterId[slug] ?? fallbackModelId;
}

function resolveAttachmentPointer(entryName: string) {
  const baseSegment = entryName.slice(entryName.lastIndexOf("/") + 1);
  if (!baseSegment.length) {
    return null;
  }

  const pointerMatch = /^file-[^-]+/.exec(baseSegment);
  if (pointerMatch) {
    const pointer = pointerMatch[0];
    let remainder = baseSegment.slice(pointer.length);
    if (remainder.startsWith("-")) {
      remainder = remainder.slice(1);
    }
    if (!remainder.length || remainder.startsWith(".")) {
      remainder = `${pointer}${remainder}`;
    }
    return {
      pointer,
      filename: remainder,
    };
  }

  const pointer = stripExtension(baseSegment);
  if (!pointer.length) {
    return null;
  }
  return {
    pointer,
    filename: baseSegment,
  };
}

function stripExtension(filename: string) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(0, index) : filename;
}

function sanitizeFileName(name: string) {
  const sanitized = name.replace(/[^a-zA-Z0-9_.-]+/g, "_");
  return sanitized.length ? sanitized : `attachment-${randomUUID()}`;
}

function determineMimeFromFilename(filename: string) {
  const index = filename.lastIndexOf(".");
  if (index === -1) {
    return "application/octet-stream";
  }
  const ext = filename.substring(index).toLowerCase();
  const lookup: Record<string, string> = {
    ".apng": "image/apng",
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".json": "application/json",
    ".zip": "application/zip",
  };
  return lookup[ext] ?? "application/octet-stream";
}
async function importConversations({
  userId,
  conversations,
  attachments,
  push,
}: {
  userId: string;
  conversations: Conversation[];
  attachments: Map<string, AttachmentEntry>;
  push: (payload: ImportProgressPayload) => void;
}) {
  if (conversations.length === 0) {
    return;
  }

  const utapi = new UTApi();
  const projectId = await ensureGeneralProject(userId);

  const contexts: Array<{
    conversation: Conversation;
    threadId: string;
  }> = [];

  for (const conversation of conversations) {
    if (!conversation) continue;
    const threadId = conversation.conversation_id ?? conversation.id;
    if (!threadId) continue;
    contexts.push({ conversation, threadId });
  }

  if (!contexts.length) {
    return;
  }

  const uniqueThreadIds = Array.from(
    new Set(contexts.map((ctx) => ctx.threadId))
  );
  let existingThreadIds = new Set<string>();
  if (uniqueThreadIds.length > 0) {
    const existing = await db
      .select({ id: threads.id })
      .from(threads)
      .where(inArray(threads.id, uniqueThreadIds));
    existingThreadIds = new Set(existing.map((row) => row.id));
  }

  const uploadedAttachments = new Map<string, UploadedAttachment | null>();
  const chatMap = new Map<string, NewChat>();
  const threadMap = new Map<string, NewThread>();
  const messageRecords: NewMessage[] = [];

  push({
    type: "progress",
    progress: 10,
    message: "Analyzing conversations",
  });

  for (const [index, context] of contexts.entries()) {
    const { conversation, threadId } = context;
    const title = conversation.title ?? "Conversation";
    const progress = 10 + Math.round(((index + 1) / contexts.length) * 40);
    push({
      type: "progress",
      progress,
      message: `Processing "${title}"`,
    });

    if (existingThreadIds.has(threadId)) {
      continue;
    }

    try {
      const prepared = await prepareConversationRecords({
        projectId,
        conversation,
        attachments,
        uploadedAttachments,
        utapi,
      });

      if (!prepared) {
        continue;
      }

      const existingChat = chatMap.get(prepared.chat.id);
      if (
        !existingChat ||
        existingChat.lastMessageAt < prepared.chat.lastMessageAt
      ) {
        chatMap.set(prepared.chat.id, prepared.chat);
      }

      if (!threadMap.has(prepared.thread.id)) {
        threadMap.set(prepared.thread.id, prepared.thread);
      }

      messageRecords.push(...prepared.messages);
    } catch (error) {
      console.error(
        `[data-import] Skipped conversation ${conversation.id ?? "unknown"}:`,
        error
      );
    }
  }

  const chatsToInsert = Array.from(chatMap.values());
  const threadsToInsert = Array.from(threadMap.values());

  if (chatsToInsert.length) {
    await insertChatsInBatches(chatsToInsert, push);
  }

  if (threadsToInsert.length) {
    await insertThreadsInBatches(threadsToInsert, push);
  }

  if (messageRecords.length) {
    await insertMessagesInBatches(messageRecords, push);
  }

  push({
    type: "progress",
    progress: 98,
    message: "Finalizing import",
  });
}

async function prepareConversationRecords({
  projectId,
  conversation,
  attachments,
  uploadedAttachments,
  utapi,
}: {
  projectId: string;
  conversation: Conversation;
  attachments: Map<string, AttachmentEntry>;
  uploadedAttachments: Map<string, UploadedAttachment | null>;
  utapi: UTApi;
}): Promise<PreparedConversationRecords | null> {
  const threadId = conversation.conversation_id ?? conversation.id;
  if (!threadId) {
    throw new Error("Conversation id missing");
  }

  const mapping = conversation.mapping ?? {};
  const nodesWithMessages = Object.values(mapping).filter(
    (
      node
    ): node is (typeof mapping)[string] & {
      message: NonNullable<(typeof node)["message"]>;
    } => Boolean(node?.message)
  );

  if (!nodesWithMessages.length) {
    return null;
  }

  const sortedNodes = [...nodesWithMessages].sort((a, b) => {
    const aTime = a.message.create_time ?? 0;
    const bTime = b.message.create_time ?? 0;
    if (aTime === bTime) return 0;
    return aTime < bTime ? -1 : 1;
  });

  const parentCache = new Map<string, string | null>();
  const resolveParentMessageId = (nodeId: string): string | null => {
    if (parentCache.has(nodeId)) {
      return parentCache.get(nodeId) ?? null;
    }
    let current = mapping[nodeId]?.parent;
    while (current) {
      const parentNode = mapping[current];
      if (!parentNode) break;
      if (parentNode.message) {
        const parentMessageId = parentNode.message.id;
        parentCache.set(nodeId, parentMessageId);
        return parentMessageId;
      }
      current = parentNode.parent;
    }
    parentCache.set(nodeId, null);
    return null;
  };

  const modelId = selectModelId(conversation.default_model_slug);

  const newMessages: NewMessage[] = [];
  const orderCreated: Date[] = [];

  for (const node of sortedNodes) {
    const message = node.message;
    const messageId = message.id ?? randomUUID();
    const rawMetadata =
      message.metadata && typeof message.metadata === "object"
        ? (message.metadata as Record<string, unknown>)
        : {};
    let role: "assistant" | "user" | "system" = "assistant";
    const authorRole = message.author?.role;
    if (
      authorRole === "assistant" ||
      authorRole === "user" ||
      authorRole === "system"
    ) {
      role = authorRole;
    } else if (authorRole === "tool") {
      role = "system";
    }
    const forceSystem =
      rawMetadata["is_user_system_message"] === true ||
      rawMetadata["is_visually_hidden_from_conversation"] === true ||
      authorRole === "tool" ||
      (typeof message.recipient === "string" && message.recipient !== "all");
    if (forceSystem) {
      role = "system";
    }
    const createdAt = message.create_time
      ? new Date(message.create_time * 1000)
      : new Date(0);

    const result = await convertConversationContent({
      content: message.content,
      metadata: rawMetadata,
      attachments,
      uploadedAttachments,
      utapi,
    });

    if (!result.parts.length) {
      continue;
    }

    const parentId = resolveParentMessageId(node.id);

    const newMessage: NewMessage = {
      id: messageId,
      threadId,
      modelId,
      parentId,
      branchNumber: 0,
      role,
      content: result.parts,
      attachments: null,
      metadata: result.metadata as unknown as MessageMetadata,
      status:
        role === "assistant" ? { type: "complete", reason: "stop" } : undefined,
      createdAt,
    };

    newMessages.push(newMessage);
    orderCreated.push(createdAt);
  }

  if (!newMessages.length) {
    return null;
  }

  const lastMessageAt = [...orderCreated]
    .sort((a, b) => a.getTime() - b.getTime())
    .pop()!;
  const chatId = conversation.id ?? threadId;
  const chatTitle = conversation.title ?? "Conversation";

  return {
    chat: {
      id: chatId,
      projectId,
      title: chatTitle,
      lastMessageAt,
    },
    thread: {
      id: threadId,
      chatId,
      lastModelId: modelId,
      lastMessageAt,
    },
    messages: newMessages,
  };
}

async function insertChatsInBatches(
  records: NewChat[],
  push: (payload: ImportProgressPayload) => void
) {
  await insertInBatches({
    items: records,
    chunkSize: 100,
    startProgress: 55,
    endProgress: 65,
    message: "Saving chats",
    push,
    insert: (chunk) =>
      db
        .insert(chats)
        .values(chunk)
        .onConflictDoUpdate({
          target: chats.id,
          set: {
            title: sql`excluded.title`,
            lastMessageAt: sql`excluded.last_message_at`,
            deletedAt: null,
            projectId: records[0]?.projectId, // all chats are imported into the default project
          },
        }),
  });
}

async function insertThreadsInBatches(
  records: NewThread[],
  push: (payload: ImportProgressPayload) => void
) {
  await insertInBatches({
    items: records,
    chunkSize: 100,
    startProgress: 65,
    endProgress: 75,
    message: "Saving threads",
    push,
    insert: (chunk) => db.insert(threads).values(chunk).onConflictDoNothing(),
  });
}

async function insertMessagesInBatches(
  records: NewMessage[],
  push: (payload: ImportProgressPayload) => void
) {
  await insertInBatches({
    items: records,
    chunkSize: 50,
    startProgress: 75,
    endProgress: 95,
    message: "Saving messages",
    push,
    insert: (chunk) => db.insert(messages).values(chunk).onConflictDoNothing(),
  });
}

async function insertInBatches<T>({
  items,
  chunkSize,
  startProgress,
  endProgress,
  message,
  push,
  insert,
}: {
  items: T[];
  chunkSize: number;
  startProgress: number;
  endProgress: number;
  message: string;
  push: (payload: ImportProgressPayload) => void;
  insert: (chunk: T[]) => Promise<unknown>;
}) {
  if (!items.length) {
    return;
  }

  push({
    type: "progress",
    progress: startProgress,
    message,
  });

  const total = items.length;
  let processed = 0;

  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    await insert(chunk);
    processed += chunk.length;
    const range = endProgress - startProgress;
    const progress =
      startProgress + Math.round((processed / total) * (range > 0 ? range : 0));
    push({
      type: "progress",
      progress: Math.min(progress, endProgress),
      message,
    });
  }
}
