import { generatePanelId } from "@/lib/id";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig, PanelState } from "@/store/panels";
import { ExportedMessageRepository } from "@assistant-ui/react";
import { useCallback } from "react";
import {
  usePanelsConfigSetter,
  usePanelsConfigValue,
  usePanelsStateSetter,
} from "./use-panels";
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
  const currentPanelsConfig = usePanelsConfigValue();
  const setPanelsConfig = usePanelsConfigSetter();
  const setPanelsState = usePanelsStateSetter();
  const utils = trpc.useUtils();

  const loadChatById = useCallback(
    async (chatId: string): Promise<UseChatActionsResult> => {
      try {
        // Fetch chat data imperatively
        const chatData = await utils.client.messages.getChatWithThreads.query({
          chatId,
        });

        if (!chatData || !getRuntimes) {
          return { success: false, error: new Error("Runtimes not loaded") };
        }

        const threads = chatData.threads;
        const currentPanels = currentPanelsConfig;

        // Step 1: Create panel configuration using thread IDs as panel IDs
        const newPanelsConfig: PanelConfig[] = [];
        const newPanelsState: Record<string, PanelState> = {};

        // Create panels for each thread, using thread ID as panel ID
        for (let i = 0; i < threads.length; i++) {
          const thread = threads[i];
          if (!thread) continue;

          const existingPanel = currentPanels[i];

          // Use thread ID as panel ID (panelId === threadId)
          const panelId = thread.id;

          newPanelsConfig.push({
            id: panelId,
            provider:
              existingPanel?.provider ||
              thread.lastModelId.split("/")[0] ||
              "openai",
            model: existingPanel?.model || thread.lastModelId,
          });

          newPanelsState[panelId] = {
            running: false,
            error: undefined,
          };
        }

        // If we have fewer threads than current panels, add empty panels for new conversations
        if (threads.length < currentPanels.length) {
          for (let i = threads.length; i < currentPanels.length; i++) {
            const existingPanel = currentPanels[i];
            if (existingPanel) {
              // Generate new panel ID for empty panels
              const panelId = generatePanelId();
              newPanelsConfig.push({
                id: panelId,
                provider: existingPanel.provider,
                model: existingPanel.model,
              });
              newPanelsState[panelId] = {
                running: false,
                error: undefined,
              };
            }
          }
        }

        // Update panel configuration and state
        setPanelsConfig(newPanelsConfig);
        setPanelsState(newPanelsState);

        // Step 2: Wait for runtimes to be registered with new panel IDs
        await new Promise((resolve) => setTimeout(resolve, 100));

        const runtimes = getRuntimes();

        // Step 3: Load messages into each runtime (panelId === threadId)
        for (const thread of threads) {
          if (!thread.messages.length) continue;

          const runtime = runtimes.get(thread.id); // Use thread.id directly as panelId
          if (!runtime) {
            console.warn(`Runtime not found for panel/thread ${thread.id}`);
            continue;
          }

          // Convert our database messages to ThreadMessageLike format
          const threadMessages = thread.messages.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant" | "system",
            content: Array.isArray(msg.content)
              ? msg.content
              : [{ type: "text", text: "Invalid content" }],
            attachments: (msg.attachments as any) || [], // Type assertion for now
            metadata: msg.metadata || {},
            // Convert status to proper MessageStatus format or undefined
            status:
              msg.status &&
              typeof msg.status === "object" &&
              "type" in msg.status
                ? (msg.status as any) // Trust that it's a valid MessageStatus
                : undefined,
            createdAt: msg.createdAt,
          }));

          try {
            const repository =
              ExportedMessageRepository.fromArray(threadMessages);
            runtime.thread.import(repository);
            console.info(
              `Loaded ${threadMessages.length} messages into panel/thread ${thread.id}`
            );
          } catch (error) {
            console.error(
              `Failed to load messages into panel/thread ${thread.id}:`,
              error
            );
          }
        }

        return { success: true, threadsLoaded: threads.length };
      } catch (error) {
        console.error("Failed to load chat:", error);
        return { success: false, error };
      }
    },
    [
      utils.client.messages.getChatWithThreads,
      getRuntimes,
      currentPanelsConfig,
      setPanelsConfig,
      setPanelsState,
    ]
  );

  return {
    loadChatById,
  };
};
