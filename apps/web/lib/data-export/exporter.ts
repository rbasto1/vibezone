import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";

import archiver from "archiver";
import { Resend } from "resend";
import { UTApi } from "uploadthing/server";

import type { Message, Thread } from "@/db";
import { chats, dataExports, db, messages, threads, userStats } from "@/db";
import { asc, eq, isNull } from "drizzle-orm";

import { siteDomain, siteName } from "@/lib/branding";
import { html as buildChatHtml } from "@/lib/openai/export-html";
import type {
  Conversation,
  ConversationNodeMessageContent,
  MultimodalTextPart,
} from "@/lib/openai/export-types";
import { exportUser } from "@/lib/openai/export-user";

interface QueueDataExportOptions {
  userId: string;
  email: string;
  displayName?: string | null;
}

interface QueueDataExportResult {
  jobId: string;
  estimatedReadyAt: Date;
  task: Promise<void>;
}

interface ExportAttachment {
  pointer: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer => {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(buffer);
  return arrayBuffer;
};

interface ConversationBuildResult {
  conversation: Conversation | null;
  attachmentMap: Record<string, string>;
}

interface DbThreadWithMessages extends Thread {
  messages: Array<
    Pick<
      Message,
      | "id"
      | "role"
      | "content"
      | "attachments"
      | "metadata"
      | "status"
      | "createdAt"
    >
  >;
}

const mimeFallbacks: Record<string, string> = {
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

export const queueDataExport = ({
  userId,
  email,
  displayName,
}: QueueDataExportOptions): QueueDataExportResult => {
  const jobId = randomUUID();
  const estimatedReadyAt = new Date(Date.now() + 5 * 60 * 1000);

  const task = executeDataExport({ userId, email, displayName, jobId });

  console.info(
    `[data-export] Queued export job ${jobId} for ${email} (${userId})`
  );

  return { jobId, estimatedReadyAt, task };
};

async function executeDataExport({
  userId,
  email,
  displayName,
  jobId,
}: QueueDataExportOptions & { jobId: string }) {
  const user = await db.query.userStats.findFirst({
    where: eq(userStats.id, userId),
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const threadsForUser = await loadThreadsForUser(userId);
  const attachmentCacheByUrl = new Map<string, ExportAttachment>();
  const attachmentsByPointer = new Map<string, ExportAttachment>();
  const assets: Record<string, string> = {};
  const conversations: Conversation[] = [];

  for (const { chatTitle, thread } of threadsForUser) {
    const result = await buildConversation({
      chatTitle,
      thread,
      attachmentCacheByUrl,
      attachmentsByPointer,
    });

    if (!result.conversation) {
      continue;
    }

    Object.assign(assets, result.attachmentMap);
    conversations.push(result.conversation);
  }

  const archiveBuffer = await createExportArchive({
    conversations,
    assets,
    attachments: Array.from(attachmentsByPointer.values()),
    user,
  });

  const utapi = new UTApi();
  const archiveFileName = `data-export-${jobId}.zip`;
  const customId = `exports/${randomUUID()}`;
  const archiveArrayBuffer = bufferToArrayBuffer(archiveBuffer);
  const archiveFile = new File([archiveArrayBuffer], archiveFileName, {
    type: "application/zip",
  });
  Object.assign(archiveFile, { customId });

  const uploadResult = await utapi.uploadFiles(archiveFile, {
    contentDisposition: "attachment",
  });

  if (!uploadResult || uploadResult.error || !uploadResult.data) {
    throw new Error(
      uploadResult?.error?.message ?? "Failed to upload export archive"
    );
  }

  await db.insert(dataExports).values({
    id: jobId,
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    chatCount: conversations.length,
    fileCount: attachmentsByPointer.size,
    fileSizeBytes: archiveBuffer.length,
    filename: archiveFileName,
  });

  await sendExportEmail({
    email,
    displayName,
    downloadUrl: uploadResult.data.ufsUrl,
    chatCount: conversations.length,
    fileCount: attachmentsByPointer.size,
    fileSizeBytes: archiveBuffer.length,
  });

  console.info(
    `[data-export] Export job ${jobId} completed for ${email} (${userId})`
  );
}

async function loadThreadsForUser(userId: string) {
  const rows = await db.query.chats.findMany({
    where: isNull(chats.deletedAt),
    columns: {
      id: true,
      title: true,
    },
    with: {
      project: {
        columns: {
          userId: true,
        },
      },
      threads: {
        columns: {
          id: true,
          chatId: true,
          lastModelId: true,
          lastMessageAt: true,
          createdAt: true,
        },
        orderBy: [asc(threads.createdAt)],
        with: {
          messages: {
            where: isNull(messages.deletedAt),
            columns: {
              id: true,
              role: true,
              content: true,
              attachments: true,
              metadata: true,
              status: true,
              createdAt: true,
            },
            orderBy: [asc(messages.createdAt)],
          },
        },
      },
    },
  });

  const threadsForUser: Array<{
    chatTitle: string;
    thread: DbThreadWithMessages;
  }> = [];

  for (const chat of rows) {
    if (chat.project?.userId !== userId) continue;
    const chatTitle = chat.title ?? "Conversation";
    for (const thread of chat.threads) {
      if (!thread.messages.length) continue;
      threadsForUser.push({
        chatTitle,
        thread: {
          ...thread,
          closedAt: null,
          updatedAt: thread.createdAt,
        },
      });
    }
  }

  return threadsForUser;
}

async function buildConversation({
  chatTitle,
  thread,
  attachmentCacheByUrl,
  attachmentsByPointer,
}: {
  chatTitle: string;
  thread: DbThreadWithMessages;
  attachmentCacheByUrl: Map<string, ExportAttachment>;
  attachmentsByPointer: Map<string, ExportAttachment>;
}): Promise<ConversationBuildResult> {
  const mapping: Record<string, Conversation["mapping"][string]> = {};
  const attachmentMap: Record<string, string> = {};

  const rootId = `${thread.id}-root`;
  mapping[rootId] = {
    id: rootId,
    parent: null,
    children: [],
    message: null,
  };

  const messages = thread.messages;
  let previousNodeId = rootId;
  let lastMessageId = rootId;

  for (const message of messages) {
    const nodeId = message.id;
    const conversationMessage = await convertMessageToConversation({
      message,
      lastModelId: thread.lastModelId,
      attachmentCacheByUrl,
      attachmentsByPointer,
      attachmentMap,
    });

    if (!conversationMessage) {
      continue;
    }

    mapping[previousNodeId]?.children.push(nodeId);
    mapping[nodeId] = {
      id: nodeId,
      parent: previousNodeId,
      children: [],
      message: conversationMessage,
    };

    previousNodeId = nodeId;
    lastMessageId = nodeId;
  }

  if (previousNodeId === rootId) {
    return { conversation: null, attachmentMap: {} };
  }

  const createTime = messages[0]?.createdAt
    ? Math.floor(messages[0]!.createdAt.getTime() / 1000)
    : Math.floor(Date.now() / 1000);
  const updateTime = messages[messages.length - 1]?.createdAt
    ? Math.floor(messages[messages.length - 1]!.createdAt.getTime() / 1000)
    : createTime;

  const conversation: Conversation = {
    id: thread.id,
    title: chatTitle,
    mapping,
    create_time: createTime,
    update_time: updateTime,
    moderation_results: [],
    current_node: lastMessageId,
    plugin_ids: null,
    conversation_id: thread.id,
    is_archived: false,
    is_starred: null,
    is_read_only: null,
    safe_urls: [],
    blocked_urls: [],
    default_model_slug: thread.lastModelId ?? undefined,
    conversation_origin: null,
    disabled_tool_ids: [],
    is_do_not_remember: false,
    memory_scope: "global_enabled",
    context_scopes: null,
    sugar_item_id: null,
    sugar_item_visible: true,
    is_study_mode: false,
    owner: null,
    conversation_template_id: null,
    gizmo_id: null,
    gizmo_type: null,
    voice: null,
    async_status: null,
  };

  return { conversation, attachmentMap };
}

async function convertMessageToConversation({
  message,
  lastModelId,
  attachmentCacheByUrl,
  attachmentsByPointer,
  attachmentMap,
}: {
  message: DbThreadWithMessages["messages"][number];
  lastModelId: string | null;
  attachmentCacheByUrl: Map<string, ExportAttachment>;
  attachmentsByPointer: Map<string, ExportAttachment>;
  attachmentMap: Record<string, string>;
}) {
  const role = (message.role ?? "assistant") as "assistant" | "user" | "system";
  const createdAt = message.createdAt ?? new Date();
  const createdSeconds = Math.floor(createdAt.getTime() / 1000);

  const partsArray = Array.isArray(message.content) ? message.content : [];

  const textParts: string[] = [];
  const imagePointers: string[] = [];
  const metadataAttachments: Array<Record<string, unknown>> = [];

  for (const part of partsArray) {
    if (!part || typeof part !== "object") continue;
    const type = String((part as { type?: unknown }).type ?? "");

    if (type === "text" || type === "reasoning") {
      const textValue = (part as { text?: unknown }).text;
      if (typeof textValue === "string" && textValue.trim().length) {
        textParts.push(textValue);
      }
      continue;
    }

    if (type === "file" || type === "image") {
      const url = extractUrlFromPart(part);
      if (!url) continue;

      const existing = await resolveAttachment({
        url,
        originalName: extractFilenameFromPart(part),
        originalMime: extractMimeFromPart(part),
        attachmentCacheByUrl,
        attachmentsByPointer,
      });

      if (!existing) continue;

      metadataAttachments.push({
        id: existing.pointer,
        size: existing.buffer.length,
        name: existing.fileName,
        mime_type: existing.mimeType,
        source: "local",
        file_token_size: Math.max(1, Math.round(existing.buffer.length / 4)),
      });
      if (existing.mimeType.startsWith("image/")) {
        imagePointers.push(existing.pointer);
      }
      attachmentMap[existing.pointer] = existing.fileName;
      continue;
    }
  }

  if (
    !textParts.length &&
    !imagePointers.length &&
    !metadataAttachments.length
  ) {
    return null;
  }

  const content = buildConversationContent(
    textParts,
    imagePointers,
    attachmentsByPointer
  );

  const baseMetadata =
    (message.metadata as unknown as Record<string, unknown>) ?? {};
  const metadataCopy: Record<string, unknown> = { ...baseMetadata };
  const existingAttachments = Array.isArray(baseMetadata.attachments)
    ? ([...baseMetadata.attachments] as Array<Record<string, unknown>>)
    : [];
  for (const attachment of metadataAttachments) {
    if (!existingAttachments.some((item) => item?.id === attachment.id)) {
      existingAttachments.push(attachment);
    }
  }
  if (existingAttachments.length) {
    metadataCopy.attachments = existingAttachments;
  }

  return {
    id: message.id,
    author: {
      role,
      name: null,
      metadata: {
        sonicberry_model_id: lastModelId ?? "",
        real_author: role,
        source: "conversation",
      },
    },
    create_time: createdSeconds,
    update_time: createdSeconds,
    content,
    status: "finished_successfully",
    end_turn: role === "assistant",
    weight: 1,
    metadata: metadataCopy,
    recipient: role === "assistant" ? "all" : "assistant",
    channel: null,
  } satisfies Conversation["mapping"][string]["message"];
}

function buildConversationContent(
  textParts: string[],
  attachmentPointers: string[],
  attachmentsByPointer: Map<string, ExportAttachment>
): ConversationNodeMessageContent {
  if (attachmentPointers.length === 0) {
    return {
      content_type: "text",
      parts: textParts.length ? textParts : [""],
    };
  }

  const parts: Array<MultimodalTextPart | string> = [...textParts];
  for (const pointer of [...new Set(attachmentPointers)]) {
    const attachment = attachmentsByPointer.get(pointer);
    const size = attachment?.buffer?.length ?? 0;
    parts.push({
      content_type: "image_asset_pointer",
      asset_pointer: pointer,
      size_bytes: size,
      fovea: null,
      metadata: {},
    } satisfies MultimodalTextPart);
  }

  return {
    content_type: "multimodal_text",
    parts,
  };
}

async function resolveAttachment({
  url,
  originalName,
  originalMime,
  attachmentCacheByUrl,
  attachmentsByPointer,
}: {
  url: string;
  originalName: string | undefined;
  originalMime: string | undefined;
  attachmentCacheByUrl: Map<string, ExportAttachment | null>;
  attachmentsByPointer: Map<string, ExportAttachment>;
}): Promise<ExportAttachment | null> {
  if (attachmentCacheByUrl.has(url)) {
    return attachmentCacheByUrl.get(url) ?? null;
  }

  try {
    const fetched = await fetchAttachment(url);
    if (!fetched) {
      return null;
    }

    const mimeType = normalizeMimeType(
      originalMime ?? fetched.mimeType ?? "",
      originalName ?? fetched.fileName
    );
    const pointer = `file-${randomUUID()}`;
    const baseName = sanitizeFileName(
      originalName ?? fetched.fileName ?? pointer
    );
    const extension =
      getExtension(baseName) || inferExtensionFromMime(mimeType);
    const fileName = `${pointer}${extension}`;

    const record: ExportAttachment = {
      pointer,
      fileName,
      mimeType,
      buffer: fetched.buffer,
    };

    attachmentCacheByUrl.set(url, record);
    attachmentsByPointer.set(pointer, record);

    return record;
  } catch (error) {
    console.warn(`[data-export] Failed to fetch attachment ${url}:`, error);
    attachmentCacheByUrl.set(url, null);
    return null;
  }
}

async function fetchAttachment(url: string) {
  if (url.startsWith("data:")) {
    const [meta, data] = url.split(",", 2);
    if (!data) return null;
    const mimeMatch = /^data:([^;]+);/.exec(meta ?? "");
    const mimeType = mimeMatch?.[1] ?? "application/octet-stream";
    const buffer = Buffer.from(
      data,
      url.includes(";base64,") ? "base64" : "utf8"
    );
    return {
      buffer,
      mimeType,
      fileName: "attachment",
    };
  }

  const response = await fetch(url).catch((error) => {
    console.error(
      `Failed to fetch attachment ${url.substring(0, 100)}:`,
      error
    );
    return { ok: false, status: 500 } as const;
  });
  if (!response.ok) {
    console.error(`Failed to fetch attachment: ${response.status}`);
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? undefined;
  const contentDisposition = response.headers.get("content-disposition");
  const suggestedName = contentDisposition
    ? parseContentDispositionFilename(contentDisposition)
    : undefined;

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType,
    fileName: suggestedName ?? extractNameFromUrl(url),
  };
}

function extractUrlFromPart(part: unknown): string | null {
  const record = part as Record<string, unknown>;
  const urlCandidate = (record.url ??
    record.data ??
    record.image ??
    record.file) as string | undefined;
  if (typeof urlCandidate === "string" && urlCandidate.length) {
    return urlCandidate;
  }
  return null;
}

function extractFilenameFromPart(part: unknown): string | undefined {
  const record = part as Record<string, unknown>;
  const value = record.filename ?? record.name;
  return typeof value === "string" ? value : undefined;
}

function extractMimeFromPart(part: unknown): string | undefined {
  const record = part as Record<string, unknown>;
  const value = record.mimeType ?? record.mediaType ?? record.type;
  return typeof value === "string" ? value : undefined;
}

function parseContentDispositionFilename(header: string): string | undefined {
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(header);
  if (!match) return undefined;
  const encoded = match[1] ?? match[2];
  if (!encoded) throw new Error("Failed to parse content disposition filename");
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function extractNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    if (lastSegment) return lastSegment;
  } catch (error) {
    console.warn("[data-export] Failed to parse attachment url", error);
  }
  return "attachment";
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

function normalizeMimeType(mime: string, fileName?: string) {
  if (mime && mime.includes("/")) {
    return mime.toLowerCase();
  }
  if (fileName) {
    const ext = getExtension(fileName);
    if (ext && mimeFallbacks[ext]) {
      return mimeFallbacks[ext];
    }
  }
  return "application/octet-stream";
}

function getExtension(fileName: string) {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
}

function inferExtensionFromMime(mimeType: string) {
  const entry = Object.entries(mimeFallbacks).find(
    ([, value]) => value === mimeType
  );
  return entry ? entry[0] : "";
}

async function createExportArchive({
  conversations,
  assets,
  attachments,
  user,
}: {
  conversations: Conversation[];
  assets: Record<string, string>;
  attachments: ExportAttachment[];
  user: typeof userStats.$inferSelect;
}) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  const buffers: Buffer[] = [];

  archive.pipe(stream);

  archive.append(JSON.stringify({}), { name: "shopping.json" });
  archive.append(JSON.stringify({}), {
    name: "shared_conversations.json",
  });
  archive.append(JSON.stringify({}), {
    name: "message_feedback.json",
  });

  archive.append(exportUser(user), { name: "user.json" });
  archive.append(JSON.stringify(conversations), {
    name: "conversations.json",
  });

  const chatHtml = buildChatHtml(conversations, assets);
  archive.append(chatHtml, { name: "chat.html" });

  for (const attachment of attachments) {
    archive.append(attachment.buffer, { name: attachment.fileName });
  }

  const finalizePromise = new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (data: Buffer) => buffers.push(data));
    stream.on("end", () => resolve(Buffer.concat(buffers)));
    archive.on("error", reject);
    stream.on("error", reject);
  });

  await archive.finalize();

  return finalizePromise;
}

async function sendExportEmail({
  email,
  displayName,
  downloadUrl,
  chatCount,
  fileCount,
  fileSizeBytes,
}: {
  email: string;
  displayName?: string | null;
  downloadUrl: string;
  chatCount: number;
  fileCount: number;
  fileSizeBytes: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[data-export] RESEND_API_KEY not configured; email skipped");
    return;
  }

  const resend = new Resend(apiKey);
  const humanSize = formatBytes(fileSizeBytes);
  const name = displayName?.trim() || "there";

  const html = [
    `<p>Hi ${escapeHtml(name)},</p>`,
    `<p>Your ${siteName} data export is ready. <a href="${downloadUrl}">Download the archive</a>. The link expires in 24 hours.</p>`,
    `<p><strong>Summary</strong><br/>Chats: ${chatCount}<br/>Attachments: ${fileCount}<br/>Archive size: ${humanSize}</p>`,
    `<p>If you did not request this export, please secure your account immediately.</p>`,
    `<p>— The ${siteName} team</p>`,
  ].join("");

  const text = `Hi ${name},\n\nYour ${siteName} data export is ready. Download the archive here: ${downloadUrl}\n\nSummary\n- Chats: ${chatCount}\n- Attachments: ${fileCount}\n- Archive size: ${humanSize}\n\nThe link expires in 24 hours.`;

  await resend.emails.send({
    from: `no-reply@${siteDomain}`,
    to: email,
    subject: `${siteName} data export ready`,
    html,
    text,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
