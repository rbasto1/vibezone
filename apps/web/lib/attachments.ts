import type {
  AttachmentAdapter,
  CompleteAttachment,
  PendingAttachment,
} from "@assistant-ui/react";
import {
  CompositeAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "@assistant-ui/react";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15MB

class VisionImageAttachmentAdapter implements AttachmentAdapter {
  public readonly accept = "image/jpeg,image/png,image/webp,image/gif";

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("Image size exceeds the 20MB limit");
    }

    return {
      id: crypto.randomUUID(),
      type: "image",
      name: file.name,
      contentType: file.type || "image/jpeg",
      file,
      status: { type: "running", reason: "uploading", progress: 0 },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const image = await this.fileToDataUrl(attachment.file);

    return {
      id: attachment.id,
      type: "image",
      name: attachment.name,
      contentType:
        attachment.contentType || attachment.file.type || "image/jpeg",
      status: { type: "complete" },
      content: [
        {
          type: "image",
          image,
          filename: attachment.name,
        },
      ],
    };
  }

  async remove(): Promise<void> {
    // no-op: browser automatically releases File references
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}

class PdfAttachmentAdapter implements AttachmentAdapter {
  public readonly accept = "application/pdf";

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error("PDF size exceeds the 15MB limit");
    }

    return {
      id: crypto.randomUUID(),
      type: "document",
      name: file.name,
      contentType: file.type || "application/pdf",
      file,
      status: { type: "running", reason: "uploading", progress: 0 },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const data = await this.fileToBase64(attachment.file);

    return {
      id: attachment.id,
      type: "document",
      name: attachment.name,
      contentType:
        attachment.contentType || attachment.file.type || "application/pdf",
      status: { type: "complete" },
      content: [
        {
          type: "file",
          filename: attachment.name,
          mimeType:
            attachment.contentType || attachment.file.type || "application/pdf",
          data,
        },
      ],
    };
  }

  async remove(): Promise<void> {
    // no-op for now
  }

  private async fileToBase64(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
}

export const createAttachmentAdapter = () =>
  new CompositeAttachmentAdapter([
    new VisionImageAttachmentAdapter(),
    new PdfAttachmentAdapter(),
    new SimpleTextAttachmentAdapter(),
  ]);
