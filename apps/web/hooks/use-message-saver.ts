import { trpc } from "@/lib/trpc/client";
import { currentChatAtom, resetMessageSaversAtom } from "@/store/chat";
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

  // Watch for new messages and save them
  useEffect(() => {
    const messages = thread.messages;
    const currentMessageCount = messages.length;

    // If we have new messages
    if (currentMessageCount > lastMessageCount.current) {
      const newMessages = messages.slice(lastMessageCount.current);
      const messagesToSave = newMessages.filter(
        (msg) => !savedMessageIds.current.has(msg.id)
      );

      if (messagesToSave.length > 0) {
        // Mark messages as saved to prevent duplicates
        messagesToSave.forEach((msg) => savedMessageIds.current.add(msg.id));

        // Save the new messages
        saveMessagesMutation.mutate(
          {
            chatId: currentChat.id,
            threadId: panelId,
            modelId,
            messages: messagesToSave.map((msg) => ({
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
            onError: (error) => {
              console.error("Failed to save messages:", error);
              // Remove from saved set so we can retry
              messagesToSave.forEach((msg) =>
                savedMessageIds.current.delete(msg.id)
              );
            },
          }
        );
      }
    }

    lastMessageCount.current = currentMessageCount;
  }, [thread.messages, currentChat.id, panelId, modelId, saveMessagesMutation]);

  return {
    isSaving: saveMessagesMutation.isPending,
    saveError: saveMessagesMutation.error,
  };
};
