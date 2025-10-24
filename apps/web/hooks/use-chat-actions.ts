import type { ChatListItem } from "@/components/assistant-ui/thread-list/thread-list-items";
import { toThreadMessageLike } from "@/lib/assistant-ui/message-converters";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig, PanelState } from "@/store/panels";
import {
  threadMessagesAtom,
  type ThreadMessagesState,
} from "@/store/thread-messages";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
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
  const queryClient = useQueryClient();

  const getListChatQueriesCache = useCallback(() => {
    const queries = queryClient.getQueriesData({}).filter(([keys]) => {
      const queryName = keys[0] as string[];
      const params = keys[1] as { type: string };
      return (
        queryName[0] === "chats" &&
        queryName[1] === "listChats" &&
        params.type === "infinite"
      );
    });

    return queries as Array<
      [
        [string[], { input: unknown }],
        {
          pageParams: unknown[];
          pages: Array<{ chats: ChatListItem[]; next: string | null }>;
        },
      ]
    >;
  }, [queryClient]);

  const optimisticallyHideChat = useCallback(
    (chatId: string) => {
      // Helper for optimistic update
      const queries = getListChatQueriesCache();
      // For now, we only optimistically remove the chat from its current place, and the invalidation
      // will take care of placing it a few seconds later in the new project.
      for (const [queryKey, data] of queries) {
        if (!data) continue;
        const dataWithoutChat = {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            chats: page.chats.filter((chat) => chat.id !== chatId),
          })),
        };
        queryClient.setQueryData(queryKey, dataWithoutChat);
      }

      return queries;
    },
    [getListChatQueriesCache, queryClient]
  );

  const optimisticallyRenameChat = useCallback(
    (chatId: string, title: string) => {
      // Helper for optimistic update
      const queries = getListChatQueriesCache();
      // For now, we only optimistically remove the chat from its current place, and the invalidation
      // will take care of placing it a few seconds later in the new project.
      for (const [queryKey, data] of queries) {
        if (!data) continue;
        const dataWithoutChat = {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            chats: page.chats.map((chat) =>
              chat.id === chatId ? { ...chat, title } : chat
            ),
          })),
        };
        queryClient.setQueryData(queryKey, dataWithoutChat);
      }

      return queries;
    },
    [getListChatQueriesCache, queryClient]
  );

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
    [utils, setCurrentChat, setPanelsConfig, setPanelsState, setThreadMessages]
  );

  const renameChat = useCallback(
    (
      renameChatInput: Parameters<
        typeof utils.client.chats.renameChat.mutate
      >[0]
    ) => {
      const queries = renameChatInput.title
        ? optimisticallyRenameChat(
            renameChatInput.chatId,
            renameChatInput.title
          )
        : null;
      return utils.client.chats.renameChat
        .mutate(renameChatInput)
        .then((chat) => {
          if (!chat.success) {
            throw new Error(chat.message);
          }
          optimisticallyRenameChat(renameChatInput.chatId, chat.title);
          return chat;
        })
        .catch((error) => {
          console.error("Failed to rename chat:", error);
          const message =
            error instanceof Error ? error.message : JSON.stringify(error);
          toast.error(`Failed to rename chat: ${message}`);

          if (queries) {
            for (const [queryKey, data] of queries) {
              queryClient.setQueryData(queryKey, data);
            }
          }
          return { success: false, message } as const;
        });
    },
    [utils, optimisticallyRenameChat, queryClient]
  );

  const archiveChat = useCallback(
    (chatId: string) => {
      const queries = optimisticallyHideChat(chatId);
      return utils.client.chats.archiveChat
        .mutate({ chatId })
        .catch((error) => {
          console.error("Failed to archive chat:", error);
          const message =
            error instanceof Error ? error.message : JSON.stringify(error);
          toast.error(`Failed to archive chat: ${message}`);

          for (const [queryKey, data] of queries) {
            queryClient.setQueryData(queryKey, data);
          }
        });
    },
    [utils, optimisticallyHideChat, queryClient]
  );

  const moveChat = useCallback(
    async (chatId: string, targetProjectId: string) => {
      const queries = optimisticallyHideChat(chatId);

      return utils.client.projects.moveChat
        .mutate({ chatId, targetProjectId })
        .then(() => utils.chats.listChats.invalidate())
        .catch((error) => {
          console.error("Failed to move chat:", error);
          const message =
            error instanceof Error ? error.message : JSON.stringify(error);
          toast.error(`Failed to move chat: ${message}`);

          for (const [queryKey, data] of queries) {
            queryClient.setQueryData(queryKey, data);
          }
        });
    },
    [utils, queryClient, optimisticallyHideChat]
  );

  return {
    loadChatById,
    renameChat,
    archiveChat,
    moveChat,
  };
};
