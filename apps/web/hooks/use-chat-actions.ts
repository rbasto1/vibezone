import { toThreadMessageLike } from "@/lib/assistant-ui/message-converters";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig, PanelState } from "@/store/panels";
import {
  threadMessagesAtom,
  type ThreadMessagesState,
} from "@/store/thread-messages";
import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { useCurrentChatSetter } from "./use-chat";
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
  const setCurrentChat = useCurrentChatSetter();
  const utils = trpc.useUtils();

  const loadChatById = useCallback(
    async (chatId: string): Promise<UseChatActionsResult> => {
      try {
        const chatData = await utils.client.chats.getChatWithThreads.query({
          chatId,
        });
        const threads = chatData.threads;

        setCurrentChat((current) => ({
          ...current,
          id: chatData.id,
          title: chatData.title,
          createdAt: chatData.createdAt ?? current.createdAt,
          projectId: chatData.project?.id ?? current.projectId ?? null,
          addedToList: true,
        }));

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
      setCurrentChat,
      setPanelsConfig,
      setPanelsState,
      setThreadMessages,
    ]
  );

  return {
    loadChatById,
  };
};
