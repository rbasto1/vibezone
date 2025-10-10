import type {
  AttachmentAdapter,
  CompleteAttachment,
  PendingAttachment,
} from "@assistant-ui/react";

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15MB

export class PdfAttachmentAdapter implements AttachmentAdapter {
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64String = reader.result.split(",")[1];
          if (base64String) {
            resolve(base64String);
          } else {
            reject(new Error("Failed to extract base64 data from file"));
          }
        } else {
          reject(new Error("Unexpected result type from FileReader"));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
