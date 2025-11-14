import { useUser } from "@/lib/auth-client";
import type { RouterOutputs } from "@/lib/trpc/client";
import { trpc } from "@/lib/trpc/client";
import type { PendingUserMessageInfo } from "@/store/pending-user-messages";
import { usePendingUserMessagesClear } from "@/store/pending-user-messages";
import { threadMessagesAtom } from "@/store/thread-messages";
import type { InfiniteData } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { useCurrentChatValue } from "./use-chat";
import { useMemoriesSetter } from "./use-memories";
import { usePanelsConfigValue } from "./use-panels";
import { useProjectsValue } from "./use-projects";
import { useStableValue } from "./use-stable-value";
import { useUIStateSetter } from "./use-ui-state";

type SaveUserMessageResult = RouterOutputs["messages"]["saveUserMessage"];
type ListChatsOutput = RouterOutputs["chats"]["listChats"];
type ChatsInfiniteData = InfiniteData<ListChatsOutput, string | null>;

export const useUserMessageSaver = () => {
  const user = useUser();
  const chat = useCurrentChatValue();
  const panelsConfig = usePanelsConfigValue();
  const projects = useProjectsValue();
  const setMemories = useMemoriesSetter();
  const clearPendingUserMessages = usePendingUserMessagesClear();
  const utils = trpc.useUtils();
  const saveUserMessageMutation = trpc.messages.saveUserMessage.useMutation({
    retry: 3,
    retryDelay: 5000,
  });
  const deleteMemoryMutation = trpc.memories.delete.useMutation();
  const setUIState = useUIStateSetter();
  const memoryToastT = useTranslations("MemoryToast");
  const saveUserMessageMutationStable = useStableValue(saveUserMessageMutation);
  const threadMessagesStable = useStableValue(useAtomValue(threadMessagesAtom));

  const isLoggedIn = !!user;
  const chatId = chat.id;
  const projectId = chat.projectId;
  const threadCount = panelsConfig.length;

  const syncThreadLists = useCallback(
    (savedChat: SaveUserMessageResult["chat"]) => {
      if (!savedChat?.projectId) return;
      const project = projects.find((item) => item.id === savedChat.projectId);
      if (!project) return;

      const hydratedChat = {
        id: savedChat.id,
        title: savedChat.title ?? "",
        lastMessageAt: savedChat.lastMessageAt
          ? new Date(savedChat.lastMessageAt)
          : new Date(),
        createdAt: savedChat.createdAt
          ? new Date(savedChat.createdAt)
          : new Date(),
        project: {
          id: project.id,
          name: project.name,
          color: project.color,
          isDefault: project.isDefault,
        },
      } satisfies ListChatsOutput["chats"][number];

      const updater = (
        previous: ChatsInfiniteData | undefined
      ): ChatsInfiniteData | undefined => {
        if (!previous) {
          return {
            pageParams: [null],
            pages: [
              {
                chats: [hydratedChat],
                next: null,
              },
            ],
          };
        }

        const exists = previous.pages.some((page) =>
          page.chats.some((chatItem) => chatItem.id === hydratedChat.id)
        );
        if (exists) return previous;

        return {
          pageParams: previous.pageParams,
          pages: previous.pages.map((page, index) =>
            index === 0
              ? {
                  ...page,
                  chats: [hydratedChat, ...page.chats],
                }
              : page
          ),
        };
      };

      utils.chats.listChats.setInfiniteData({ projectId: project.id }, updater);
      utils.chats.listChats.setInfiniteData({ projectId: undefined }, updater);
    },
    [projects, utils]
  );

  return useCallback(
    (pendingUserMessages: PendingUserMessageInfo[]) => {
      if (
        !isLoggedIn ||
        !projectId ||
        !threadCount ||
        pendingUserMessages.length < threadCount
      ) {
        return;
      }
      if (pendingUserMessages.length > threadCount) {
        toast.error(
          "Error saving messages (too many threads). Please refresh the page."
        );
        clearPendingUserMessages();
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const threads = pendingUserMessages.map((messageInfo) => {
        const existingMessages =
          threadMessagesStable.current[messageInfo.threadId] ?? [];
        const systemMessages = existingMessages.filter(
          (message) => message.role === "system"
        );

        return {
          id: messageInfo.threadId,
          modelId: messageInfo.modelId,
          messages: [...systemMessages, messageInfo.message],
        };
        // messages has read-only components, for now let's ignore the warning
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;

      const saveUserMessageMutation = saveUserMessageMutationStable.current;
      void saveUserMessageMutation
        .mutateAsync({
          chatId,
          projectId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          threads,
        })
        .then((result) => {
          syncThreadLists(result.chat);
          const memory = result.memory;
          if (!memory) return;
          setMemories((current) => [memory].concat(current));

          toast.custom(
            (toastId: string | number) => (
              <div className="rounded-lg border bg-background px-4 py-3 text-sm shadow-sm">
                <div className="font-semibold">{memoryToastT("title")}</div>
                <p className="text-muted-foreground text-xs">
                  {memoryToastT("description", {
                    title: memory.title || memoryToastT("untitled"),
                  })}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-destructive px-3 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                    onClick={() =>
                      deleteMemoryMutation.mutate(
                        { id: memory.id },
                        {
                          onSuccess: () => {
                            setMemories((current) =>
                              current.filter(
                                (memoryEntry) => memoryEntry.id !== memory.id
                              )
                            );
                            toast.dismiss(toastId);
                          },
                          onError: (error: unknown) => {
                            const message: string =
                              error instanceof Error
                                ? error.message
                                : memoryToastT("errors.delete");
                            toast.error(message);
                          },
                        }
                      )
                    }
                  >
                    {memoryToastT("actions.delete")}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1 text-xs font-medium transition hover:bg-muted"
                    onClick={() => {
                      setUIState({
                        panelOpen: "preferences",
                        preferencesTab: "memories",
                      });
                      toast.dismiss(toastId);
                    }}
                  >
                    {memoryToastT("actions.manage")}
                  </button>
                </div>
              </div>
            ),
            { duration: 10000 }
          );
        })
        .catch((error) => {
          console.error("onError: failed to save user message:", error);
        })
        .finally(clearPendingUserMessages);
    },
    [
      isLoggedIn,
      projectId,
      threadCount,
      saveUserMessageMutationStable,
      threadMessagesStable,
      chatId,
      clearPendingUserMessages,
      syncThreadLists,
      setMemories,
      deleteMemoryMutation,
      setUIState,
      memoryToastT,
    ]
  );
};
