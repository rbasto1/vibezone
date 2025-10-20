"use client";

import type { TextMessagePartComponent } from "@assistant-ui/react";
import { FileTextIcon } from "lucide-react";
import type { FC } from "react";
import { MarkdownText } from "./markdown-text";

/**
 * Unescapes HTML entities in a string
 */
const unescapeHtml = (text: string): string => {
  const htmlUnescapes: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };
  return text.replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (entity) => htmlUnescapes[entity] || entity
  );
};

/**
 * Extracts attachment name and content from attachment tag
 */
const parseAttachment = (
  text: string
): { name: string; content: string } | null => {
  if (
    !text.startsWith('<attachment name="') ||
    !text.endsWith("</attachment>")
  ) {
    return null;
  }

  // Extract the name from the opening tag (it may contain escaped HTML entities)
  const nameMatch = text.match(/<attachment name="([^"]+)">/);
  if (!nameMatch || !nameMatch[1]) return null;

  // Unescape the filename
  const name = unescapeHtml(nameMatch[1]);

  // Extract content between opening and closing tags
  const contentStart = text.indexOf(">\n") + 2;
  const contentEnd = text.lastIndexOf("\n</attachment>");

  if (contentStart === -1 || contentEnd === -1) return null;

  const content = text.slice(contentStart, contentEnd);

  return { name, content };
};

/**
 * Component that renders a file attachment as a clickable tile
 */
const AttachmentTile: FC<{ name: string; content: string }> = ({
  name,
  content,
}) => {
  const trimmedContent = content.trim();
  const isRemote = /^https?:\/\//i.test(trimmedContent);

  const handleClick = () => {
    if (isRemote) {
      window.open(trimmedContent, "_blank", "noopener,noreferrer");
      return;
    }
    // Create a blob and download the file
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <FileTextIcon className="size-4 text-muted-foreground" />
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
};

/**
 * Custom Text component that detects and renders file attachments
 */
export const TextWithAttachments: TextMessagePartComponent = ({ text }) => {
  const attachment = parseAttachment(text);

  // If this is an attachment, render it as a file tile
  if (attachment) {
    return (
      <AttachmentTile name={attachment.name} content={attachment.content} />
    );
  }

  // Otherwise, render as regular markdown
  return <MarkdownText />;
};
