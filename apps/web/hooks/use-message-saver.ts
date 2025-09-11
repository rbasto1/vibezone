import { trpc } from "@/lib/trpc/client";
import { currentChatAtom, resetMessageSaversAtom } from "@/store/chat";
import type { ThreadMessage } from "@assistant-ui/react";
import { useThread } from "@assistant-ui/react";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";

interface UseMessageSaverOptions {
  panelId: string;
  modelId: string;
}

export const useMessageSaver = ({
  panelId,
  modelId,
}: UseMessageSaverOptions) => {
  const currentChat = useAtomValue(currentChatAtom);
  const resetSignal = useAtomValue(resetMessageSaversAtom);
  const thread = useThread();
  const saveMessagesMutation = trpc.messages.saveMessages.useMutation();
  const savedMessageIds = useRef(new Set<string>());
  const lastMessageCount = useRef(0);

  // Reset when chat changes or reset signal is triggered
  useEffect(() => {
    savedMessageIds.current.clear();
    lastMessageCount.current = 0;
  }, [currentChat.id, resetSignal]);

  // Watch for new messages and status changes
  useEffect(() => {
    const messages = thread.messages;
    const currentMessageCount = messages.length;

    // Check for new messages or status changes
    const messagesToSave: ThreadMessage[] = [];

    // Check new messages
    if (currentMessageCount > lastMessageCount.current) {
      const newMessages = messages.slice(lastMessageCount.current);
      messagesToSave.push(...newMessages);
    }

    // Check for status changes in existing messages (e.g., running -> complete)
    messages.forEach((msg) => {
      if (
        msg.role === "assistant" &&
        msg.status &&
        !savedMessageIds.current.has(msg.id)
      ) {
        // If message is now complete and wasn't saved before, save it
        if (msg.status.type !== "running") {
          console.info(
            `Assistant message ${msg.id} is now complete, saving it`
          );
          messagesToSave.push(msg);
        }
      }
    });

    // Filter messages to save
    const filteredMessagesToSave = messagesToSave.filter((msg) => {
      // Don't save if already saved
      if (savedMessageIds.current.has(msg.id)) {
        return false;
      }

      // Don't save assistant messages that are still running/in_progress
      if (msg.role === "assistant" && msg.status) {
        if (msg.status.type === "running") {
          console.info(`Skipping running assistant message ${msg.id}`);
          return false;
        }
      }

      return true;
    });

    if (filteredMessagesToSave.length > 0) {
      // Mark messages as saved to prevent duplicates (even before successful save)
      filteredMessagesToSave.forEach((msg) =>
        savedMessageIds.current.add(msg.id)
      );

      // Save the messages (panelId === threadId)
      saveMessagesMutation.mutate(
        {
          chatId: currentChat.id,
          threadId: panelId, // panelId is the same as threadId
          modelId,
          messages: filteredMessagesToSave.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            attachments: msg.attachments || [],
            metadata: msg.metadata || {},
            status: msg.status || {},
            createdAt: msg.createdAt,
          })),
        },
        {
          onSuccess: () => {
            console.info(
              `Successfully saved ${filteredMessagesToSave.length} messages`
            );
          },
          onError: (error) => {
            console.error("Failed to save messages:", error);
            // Don't remove from saved set on error to prevent infinite retry loop
            // The message will be retried on next chat/thread change
          },
        }
      );
    }

    lastMessageCount.current = currentMessageCount;
  }, [thread.messages, currentChat.id, panelId, modelId, saveMessagesMutation]);

  return {
    isSaving: saveMessagesMutation.isPending,
    saveError: saveMessagesMutation.error,
  };
};
