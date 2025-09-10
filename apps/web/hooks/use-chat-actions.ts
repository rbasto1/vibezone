import { trpc } from "@/lib/trpc/client";
import type { PanelConfig, PanelState } from "@/store/panels";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { useCallback } from "react";
import { usePanelsConfigSetter, usePanelsStateSetter } from "./use-panels";
import { useRuntimes } from "./use-response-registration";

type UseChatActionsResult = UseChatActionsSuccess | UseChatActionsError;
interface UseChatActionsSuccess {
  success: true;
  threadsLoaded: number;
}
interface UseChatActionsError {
  success: false;
  error: unknown;
}

export const useChatActions = () => {
  const getRuntimes = useRuntimes();
  const setPanelsConfig = usePanelsConfigSetter();
  const setPanelsState = usePanelsStateSetter();
  const utils = trpc.useUtils();

  const loadChatById = useCallback(
    async (chatId: string): Promise<UseChatActionsResult> => {
      if (!getRuntimes) {
        return { success: false, error: new Error("Runtimes not loaded") };
      }

      try {
        // Fetch chat data imperatively
        const chatData = await utils.client.messages.getChatWithThreads.query({
          chatId,
        });
        const threads = chatData.threads;

        // Step 1: Create panel configuration using thread IDs as panel IDs
        const newPanelsConfig = threads.map((thread): PanelConfig => {
          // Convert database messages to ThreadMessageLike format
          const threadMessages = thread.messages.map(
            (msg): ThreadMessageLike => ({
              id: msg.id,
              role: msg.role as "user" | "assistant" | "system",
              content: Array.isArray(msg.content)
                ? msg.content
                : [{ type: "text", text: "Invalid content" }],
              attachments: [],
              metadata: msg.metadata || {},
              status:
                msg.status &&
                typeof msg.status === "object" &&
                "type" in msg.status
                  ? msg.status
                  : undefined,
              createdAt: msg.createdAt,
            })
          );

          return {
            id: thread.id,
            provider: thread.lastModelId.split("/")[0] ?? thread.lastModelId,
            model: thread.lastModelId,
            initialMessages: threadMessages,
          };
        });
        const newPanelsState: Record<string, PanelState> =
          newPanelsConfig.reduce(
            (acc, panel) => {
              acc[panel.id] = { running: false };
              return acc;
            },
            {} as Record<string, PanelState>
          );

        // Update panel configuration and state
        setPanelsConfig(newPanelsConfig);
        setPanelsState(newPanelsState);

        return { success: true, threadsLoaded: threads.length };
      } catch (error) {
        console.error("Failed to load chat:", error);
        return { success: false, error };
      }
    },
    [
      utils.client.messages.getChatWithThreads,
      getRuntimes,
      setPanelsConfig,
      setPanelsState,
    ]
  );

  return {
    loadChatById,
  };
};
