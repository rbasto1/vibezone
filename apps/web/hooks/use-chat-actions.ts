import type { Message } from "@/db";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig, PanelState } from "@/store/panels";
import type { UIMessage } from "ai";
import { useCallback } from "react";
import { usePanelsConfigSetter, usePanelsStateSetter } from "./use-panels";
import { useRuntimes } from "./use-response-registration";

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
  const getRuntimes = useRuntimes();
  const setPanelsConfig = usePanelsConfigSetter();
  const setPanelsState = usePanelsStateSetter();
  const utils = trpc.useUtils();

  const loadChatById = useCallback(
    async (chatId: string): Promise<UseChatActionsResult> => {
      if (!getRuntimes) {
        return { success: false, error: "Runtimes not loaded" };
      }

      try {
        const chatData = await utils.client.chats.getChatWithThreads.query({
          chatId,
        });
        const threads = chatData.threads;

        const newPanelsConfig = threads.map((thread): PanelConfig => {
          // Convert database messages to UIMessage format
          const initialMessages = thread.messages.map(convertToUIMessage);

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
              acc[panel.id] = { running: false, dirty: false };
              return acc;
            },
            {} as Record<string, PanelState>
          );

        setPanelsState(newPanelsState);
        setPanelsConfig(newPanelsConfig);

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
      getRuntimes,
      setPanelsConfig,
      setPanelsState,
    ]
  );

  return {
    loadChatById,
  };
};

// Helper function to convert database messages to UIMessage format
const convertToUIMessage = (msg: Message): UIMessage => {
  // Convert content parts to UIMessage parts
  const parts = Array.isArray(msg.content)
    ? msg.content.map((part) => {
        if (part.type === "text") {
          return {
            type: "text" as const,
            text: part.text || "",
          };
        }
        // Add other content types as needed
        return {
          type: "text" as const,
          text: JSON.stringify(part),
        };
      })
    : [{ type: "text" as const, text: String(msg.content) }];

  const uiMessage: UIMessage = {
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    parts,
  };

  return uiMessage;
};
