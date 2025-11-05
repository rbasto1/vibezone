import type { ThreadMessageLike } from "@assistant-ui/react";

type ComparableMessage = {
  role: ThreadMessageLike["role"];
  text: string;
};

const extractPartText = (
  part: ThreadMessageLike["content"][number]
): string => {
  if (typeof part === "string") {
    return part;
  }

  if (part && typeof part === "object" && "text" in part) {
    const { text } = part as { text?: unknown };
    return typeof text === "string" ? text : "";
  }

  return "";
};

const extractContentText = (
  content: ThreadMessageLike["content"] | undefined
): string => {
  if (!content) {
    return "";
  }

  if (Array.isArray(content)) {
    const parts = content as ReadonlyArray<
      ThreadMessageLike["content"][number]
    >;
    return parts
      .map((part) => extractPartText(part))
      .filter((value) => value.length > 0)
      .join("\n");
  }

  if (typeof content === "string") {
    return content;
  }

  if (typeof content === "object" && "text" in content) {
    const { text } = content as { text?: unknown };
    return typeof text === "string" ? text : "";
  }

  return "";
};

export const toComparableMessages = (
  messages?: ThreadMessageLike[]
): ComparableMessage[] => {
  if (!messages?.length) {
    return [];
  }

  return messages.map((message) => {
    const content = message.content;
    const text = extractContentText(content);

    return {
      role: message.role,
      text,
    };
  });
};

export const comparableMessagesEqual = (
  first: ComparableMessage[],
  second: ComparableMessage[]
) => {
  if (first.length !== second.length) {
    return false;
  }

  return first.every(
    (message, index) =>
      message.role === second[index]?.role &&
      message.text === second[index]?.text
  );
};
