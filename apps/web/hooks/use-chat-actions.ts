import type { Message } from "@/db";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig, PanelState } from "@/store/panels";
import {
  threadMessagesAtom,
  type ThreadMessagesState,
} from "@/store/thread-messages";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { generateId } from "ai";
import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { usePanelsConfigSetter, usePanelsStateSetter } from "./use-panels";

export type UseChatActionsResult = UseChatActionsSuccess | UseChatActionsError;
interface UseChatActionsSuccess {
  success: true;
  error: undefined;
}
interface UseChatActionsError {
  success: false;
  error: string;
}

export const useChatActions = () => {
  const setPanelsConfig = usePanelsConfigSetter();
  const setPanelsState = usePanelsStateSetter();
  const setThreadMessages = useSetAtom(threadMessagesAtom);
  const utils = trpc.useUtils();

  const loadChatById = useCallback(
    async (chatId: string): Promise<UseChatActionsResult> => {
      try {
        const chatData = await utils.client.chats.getChatWithThreads.query({
          chatId,
        });
        const threads = chatData.threads;

        const threadMessages: ThreadMessagesState = {};
        const newPanelsConfig = threads.map((thread): PanelConfig => {
          // Convert database messages to ThreadMessageLike format
          const initialMessages = thread.messages.map(toThreadMessageLike);
          threadMessages[thread.id] = initialMessages;

          return {
            id: thread.id,
            provider: thread.lastModelId.split("/")[0] ?? thread.lastModelId,
            model: thread.lastModelId,
            initialMessages,
          };
        });
        const newPanelsState: Record<string, PanelState> =
          newPanelsConfig.reduce(
            (acc, panel) => {
              acc[panel.id] = {
                running: false,
                dirty: false,
                hasMessages: true,
              };
              return acc;
            },
            {} as Record<string, PanelState>
          );

        setPanelsState(newPanelsState);
        setPanelsConfig(newPanelsConfig);
        setThreadMessages(threadMessages);

        return { success: true, error: undefined };
      } catch (error) {
        console.error("Failed to load chat:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : JSON.stringify(error),
        };
      }
    },
    [
      utils.client.chats.getChatWithThreads,
      setPanelsConfig,
      setPanelsState,
      setThreadMessages,
    ]
  );

  return {
    loadChatById,
  };
};

// Helper function to convert database messages to ThreadMessageLike format
const toThreadMessageLike = (msg: Message): ThreadMessageLike => {
  const role = (msg.role ?? "system") as "user" | "assistant" | "system";

  const contentArray = Array.isArray(msg.content)
    ? msg.content.map(convertContentPart)
    : [{ type: "text", text: String(msg.content ?? "") }];

  const status = role === "assistant" ? convertStatus(msg.status) : undefined;

  const threadMessage: ThreadMessageLike = {
    id: msg.id,
    role,
    content: contentArray as ThreadMessageLike["content"],
    attachments: Array.isArray(msg.attachments)
      ? (msg.attachments as ThreadMessageLike["attachments"])
      : undefined,
    metadata: msg.metadata?.custom
      ? { custom: msg.metadata.custom }
      : undefined,
    createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
    ...(status ? { status } : {}),
  };

  return threadMessage;
};

const convertContentPart = (
  part: unknown
): ThreadMessageLike["content"][number] => {
  const candidate = part as Record<string, unknown>;
  switch (candidate?.type) {
    case "text":
      return {
        type: "text",
        text: typeof candidate.text === "string" ? candidate.text : "",
      };
    case "reasoning":
      return {
        type: "reasoning",
        text: typeof candidate.text === "string" ? candidate.text : "",
      } as ThreadMessageLike["content"][number];
    case "image":
      return {
        type: "image",
        image:
          typeof candidate.image === "string"
            ? candidate.image
            : String(candidate.url ?? ""),
        filename:
          typeof candidate.filename === "string"
            ? candidate.filename
            : undefined,
      } as ThreadMessageLike["content"][number];
    case "file":
      return {
        type: "file",
        data: typeof candidate.url === "string" ? candidate.url : "",
        mimeType:
          typeof candidate.mediaType === "string"
            ? candidate.mediaType
            : "application/octet-stream",
        filename:
          typeof candidate.filename === "string"
            ? candidate.filename
            : undefined,
      } as ThreadMessageLike["content"][number];
    case "tool-call":
    case "tool-result":
      return {
        type: "tool-call",
        toolCallId:
          typeof candidate.toolCallId === "string"
            ? candidate.toolCallId
            : generateId(),
        toolName:
          typeof candidate.toolName === "string"
            ? candidate.toolName
            : "unknown-tool",
        args: (candidate.args ?? {}) as unknown,
        argsText:
          typeof candidate.argsText === "string"
            ? candidate.argsText
            : JSON.stringify(candidate.args ?? {}),
        result: candidate.result,
        isError: Boolean(candidate.isError),
        parentId:
          typeof candidate.parentId === "string"
            ? candidate.parentId
            : undefined,
      } as ThreadMessageLike["content"][number];
    default:
      return {
        type: "text",
        text: JSON.stringify(part ?? {}),
      } as ThreadMessageLike["content"][number];
  }
};

const convertStatus = (
  status: Message["status"]
): ThreadMessageLike["status"] => {
  if (!status?.type) return undefined;
  switch (status.type) {
    case "running":
      return { type: "running" };
    case "requires-action":
      if (status.reason === "tool-calls") {
        return { type: "requires-action", reason: "tool-calls" };
      }
      return undefined;
    case "complete":
      return {
        type: "complete",
        reason:
          status.reason === "stop" || status.reason === "unknown"
            ? status.reason
            : "unknown",
      };
    case "incomplete":
      return {
        type: "incomplete",
        reason:
          status.reason === "cancelled" ||
          status.reason === "tool-calls" ||
          status.reason === "length" ||
          status.reason === "content-filter" ||
          status.reason === "other" ||
          status.reason === "error"
            ? status.reason
            : "other",
      };
    default:
      return undefined;
  }
};
