import type {
  AttachmentAdapter,
  CompleteAttachment,
  PendingAttachment,
} from "@assistant-ui/react";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB

export class VisionImageAttachmentAdapter implements AttachmentAdapter {
  public readonly accept = "image/jpeg,image/png,image/webp,image/gif";

  // eslint-disable-next-line @typescript-eslint/require-await
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
      file: attachment.file,
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
      reader.onerror = (error) => reject(new Error(error.type));
      reader.readAsDataURL(file);
    });
  }
}
