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

const ATTACHMENT_TAG_REGEX =
  /^<attachment name="([^"]+)">\n([\s\S]*)\n<\/attachment>$/;

const ensureArray = <T>(value: readonly T[] | undefined): T[] =>
  Array.isArray(value) ? [...(value as T[])] : ([] as T[]);

const replaceContentWithRemoteUrl = (
  attachment: CompleteAttachment,
  remoteUrl: string
) => {
  return ensureArray(attachment.content).map<ThreadUserMessagePart>((part) => {
    if (part.type === "image") {
      return {
        ...part,
        image: remoteUrl,
        filename: part.filename ?? attachment.name,
      };
    }
    if (part.type === "file") {
      return {
        ...part,
        data: remoteUrl,
        mimeType: part.mimeType ?? attachment.contentType,
        filename: part.filename ?? attachment.name,
      };
    }
    if (part.type === "text") {
      return {
        ...part,
        text: sanitizeAttachmentText(part.text, remoteUrl),
      };
    }
    return part;
  });
};

const buildAttachmentTag = (name: string, value: string) =>
  `<attachment name="${name}">\n${value}\n</attachment>`;

const parseAttachmentTag = (
  text: string
): { name: string; content: string } | null => {
  const match = text.match(ATTACHMENT_TAG_REGEX);
  if (!match?.[1] || !match?.[2]) return null;
  return { name: match[1], content: match[2] };
};

export const sanitizeAttachmentText = (text: string, remoteUrl: string) => {
  const parsed = parseAttachmentTag(text);
  if (!parsed) {
    return remoteUrl;
  }
  return buildAttachmentTag(parsed.name, remoteUrl);
};

export const applyUploadMetaToAttachment = (
  attachment: CompleteAttachment,
  meta: UploadMeta,
  originalFile?: File
): CompleteAttachment => {
  const remoteUrl = meta.fileUrl;
  const content = replaceContentWithRemoteUrl(attachment, remoteUrl);

  return {
    ...attachment,
    file: originalFile ?? attachment.file,
    content,
    contentType: meta.contentType ?? attachment.contentType,
    name: meta.name ?? attachment.name,
  };
};
