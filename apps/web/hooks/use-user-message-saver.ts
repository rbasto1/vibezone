import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import type { PendingUserMessageInfo } from "@/store/pending-user-messages";
import { usePendingUserMessagesClear } from "@/store/pending-user-messages";
import { useCallback } from "react";
import { useCurrentChatValue } from "./use-chat";
import { usePanelsConfigValue } from "./use-panels";
import { useStableValue } from "./use-stable-value";

export const useUserMessageSaver = () => {
  const user = useUser();
  const chat = useCurrentChatValue();
  const panelsConfig = usePanelsConfigValue();
  const clearPendingUserMessages = usePendingUserMessagesClear();
  const saveUserMessageMutation = trpc.messages.saveUserMessage.useMutation();
  const saveUserMessageMutationStable = useStableValue(saveUserMessageMutation);

  const isLoggedIn = !!user;
  const chatId = chat.id;
  const projectId = chat.projectId;
  const threadCount = panelsConfig.length;

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

      const threads = pendingUserMessages.map((messageInfo) => {
        return {
          id: messageInfo.threadId,
          modelId: messageInfo.modelId,
          message: messageInfo.message,
        };
        // messages has read-only components, for now let's ignore the warning
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;

      const saveUserMessageMutation = saveUserMessageMutationStable.current;
      void saveUserMessageMutation.mutateAsync(
        {
          chatId,
          projectId,
          threads,
        },
        { onSuccess: clearPendingUserMessages }
      );
    },
    [
      isLoggedIn,
      projectId,
      threadCount,
      saveUserMessageMutationStable,
      chatId,
      clearPendingUserMessages,
    ]
  );
};
