"use client";

import type {
  CompleteAttachment,
  ThreadUserMessagePart,
} from "@assistant-ui/react";

export interface UploadMeta {
  fileUrl: string;
  fileKey: string;
  size: number;
  contentType?: string;
  name?: string;
  uploadedBy?: string;
}

export interface SerializableAttachment
  extends Omit<CompleteAttachment, "file"> {
  remoteUrl?: string;
  remoteKey?: string;
  remoteSize?: number;
  remoteContentType?: string;
  originalFileName?: string;
  remoteUploadedBy?: string;
}

const ATTACHMENT_TAG_REGEX =
  /^<attachment name="([^"]+)">\n([\s\S]*)\n<\/attachment>$/;

const EXTENSION_MIME_MAP: Record<string, string> = {
  txt: "text/plain",
  text: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  ts: "application/typescript",
  tsx: "application/typescript",
  jsx: "application/javascript",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  rar: "application/vnd.rar",
};

export const isRemoteUrl = (value: string | undefined) =>
  typeof value === "string" && /^https?:\/\//i.test(value);

export const parseAttachmentTag = (
  text: string
): { name: string; content: string } | null => {
  const match = text.match(ATTACHMENT_TAG_REGEX);
  if (!match?.[1] || !match?.[2]) return null;
  return {
    name: match[1],
    content: match[2],
  };
};

export const buildAttachmentTag = (name: string, value: string) =>
  `<attachment name="${name}">\n${value}\n</attachment>`;

const decodeBase64 = (base64: string): Uint8Array | null => {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let idx = 0; idx < binary.length; idx += 1) {
      bytes[idx] = binary.charCodeAt(idx);
    }
    return bytes;
  } catch (error) {
    console.error("Failed to decode base64:", error);
    return null;
  }
};

export const dataUrlToFile = (
  dataUrl: string,
  name: string,
  fallbackType: string
): File | null => {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  const [, mimeTypeRaw, base64] = match;
  if (!base64) return null;
  const bytes = decodeBase64(base64);
  if (!bytes) return null;
  const mimeType = mimeTypeRaw || fallbackType;
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], name, { type: mimeType });
};

export const base64ToFile = (
  base64: string,
  name: string,
  mimeType: string
): File | null => {
  const bytes = decodeBase64(base64);
  if (!bytes) return null;
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], name, { type: mimeType });
};

export const textToFile = (text: string, name: string, mimeType: string) =>
  new File([text], name, { type: mimeType });

export const guessMimeTypeFromFilename = (
  filename: string | undefined,
  fallback: string
) => {
  if (!filename) return fallback;
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) return fallback;
  return EXTENSION_MIME_MAP[extension] ?? fallback;
};

export const buildSerializableAttachment = (params: {
  id?: string;
  type: "image" | "document" | "file";
  name: string;
  contentType: string;
  remoteUrl: string;
  content: ThreadUserMessagePart[];
  meta?: UploadMeta;
}): SerializableAttachment => {
  const { id, type, name, contentType, remoteUrl, content, meta } = params;

  return {
    id: id ?? crypto.randomUUID(),
    type,
    name,
    contentType,
    status: { type: "complete" },
    content,
    remoteUrl,
    remoteKey: meta?.fileKey,
    remoteSize: meta?.size,
    remoteContentType: meta?.contentType ?? contentType,
    originalFileName: meta?.name ?? name,
    remoteUploadedBy: meta?.uploadedBy,
  };
};

export const sanitizeAttachmentText = (
  existingText: string,
  name: string,
  remoteUrl: string
) => {
  const match = parseAttachmentTag(existingText);
  if (!match) {
    return buildAttachmentTag(name, remoteUrl);
  }
  return buildAttachmentTag(match.name, remoteUrl);
};
