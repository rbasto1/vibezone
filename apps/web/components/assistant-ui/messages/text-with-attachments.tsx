"use client";

import type { TextMessagePartComponent } from "@assistant-ui/react";
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
 * Custom Text component that detects and renders file attachments
 */
export const TextWithAttachments: TextMessagePartComponent = ({ text }) => {
  const attachment = parseAttachment(text);

  // If this is an attachment, render it as a file tile
  if (attachment) return null;

  // Otherwise, render as regular markdown
  return <MarkdownText />;
};
