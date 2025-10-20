import type {
  AttachmentAdapter,
  CompleteAttachment,
  PendingAttachment,
} from "@assistant-ui/react";

export class TextAttachmentAdapter implements AttachmentAdapter {
  // Accept common text and code file types
  public readonly accept = [
    // Standard text types
    "text/plain",
    "text/html",
    "text/markdown",
    "text/csv",
    "text/xml",
    "text/css",
    // Application types that are text-based
    "application/json",
    "application/xml",
    "application/javascript",
    "application/typescript",
    "application/x-sh",
    "application/x-shellscript",
    // Common code file extensions (fallback for when MIME type isn't set correctly)
    ".txt",
    ".md",
    ".json",
    ".xml",
    ".html",
    ".css",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".py",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".scala",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".conf",
    ".config",
    ".env",
    ".sql",
    ".graphql",
    ".proto",
    ".dockerfile",
    ".makefile",
  ].join(",");

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    return {
      id: crypto.randomUUID(),
      type: "document",
      name: file.name,
      contentType: file.type || "text/plain",
      file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const text = await this.fileToText(attachment.file);
    // Escape the filename to handle special characters like quotes
    const escapedName = this.escapeHtml(attachment.name);

    return {
      id: attachment.id,
      type: "document",
      name: attachment.name,
      contentType:
        attachment.contentType || attachment.file.type || "text/plain",
      status: { type: "complete" },
      file: attachment.file,
      content: [
        {
          type: "text",
          text: `<attachment name="${escapedName}">\n${text}\n</attachment>`,
        },
      ],
    };
  }

  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
  }

  async remove(): Promise<void> {
    // no-op: browser automatically releases File references
  }

  private fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }
}
