import type { MessageMetadata } from "@/db/json-columns-types";
import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import type { ThreadMessage } from "@assistant-ui/react";
import { useThread } from "@assistant-ui/react";
import { useEffect, useRef } from "react";
import { useCurrentChat } from "./use-chat";
import { usePanelStateValue } from "./use-panels";

interface DebouncedSaveTimeout {
  timeout: ReturnType<typeof setTimeout> | null;
  lastSavedAt: number;
}

const DEBOUNCED_SAVE_TIMEOUT = 1000;

export const useMessageSaver = (panel: PanelConfig) => {
  const { id, model, initialMessages } = panel;

  // Remote states
  const [currentChat, setCurrentChat] = useCurrentChat();
  const thread = useThread();
  const utils = trpc.useUtils();
  const user = useUser();
  const panelState = usePanelStateValue(id);

  // Local states
  const debouncedSaveTimeout = useRef<DebouncedSaveTimeout>({
    timeout: null,
    lastSavedAt: Date.now(),
  });
  const saveMessagesMutation = trpc.messages.saveMessages.useMutation({
    onSuccess: () => {
      void utils.chats.listChats.invalidate();
    },
  });
  const savedMessageIds = useRef(
    new Set<string>(
      (initialMessages ?? [])
        .map((msg) => msg.id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const userId = user?.id;
  const messages = thread.messages;
  const isDirty = panelState.dirty;
  const chatId = currentChat.id;

  // Watch for messages and save ones that are ready and not yet saved
  useEffect(() => {
    if (!isDirty) return;
    if (debouncedSaveTimeout.current.timeout) return; // there is a save queued
    save();

    function save() {
      if (
        debouncedSaveTimeout.current.lastSavedAt >
        Date.now() - DEBOUNCED_SAVE_TIMEOUT
      ) {
        debouncedSaveTimeout.current.timeout = setTimeout(
          save,
          DEBOUNCED_SAVE_TIMEOUT
        );
        return;
      }
      debouncedSaveTimeout.current.lastSavedAt = Date.now();
      debouncedSaveTimeout.current.timeout = null;

      // Determine which messages are ready to be saved
      const shouldSave = (msg: ThreadMessage) => {
        // Already saved
        if (savedMessageIds.current.has(msg.id)) return false;
        // Assistant messages only when not running
        if (msg.role === "assistant") {
          return msg.status?.type !== "running";
        }
        // User and other roles: save immediately
        return true;
      };

      // Collect and dedupe by id
      const toSaveMap = new Map<string, ThreadMessage>();
      for (const msg of messages) {
        if (shouldSave(msg)) {
          toSaveMap.set(msg.id, msg);
        }
      }
      const toSave = Array.from(toSaveMap.values());

      if (!toSave.length) return;

      // Mark as saved immediately to avoid duplicate saves on rapid renders
      toSave.forEach((m) => savedMessageIds.current.add(m.id));

      // Optimistically ensure chat exists in cache
      if (userId) {
        setCurrentChat((currentChat) => {
          if (currentChat.addedToList) return currentChat;

          void utils.chats.listChats.invalidate();

          return {
            ...currentChat,
            addedToList: true,
          };
        });

        saveMessagesMutation.mutate(
          {
            chatId,
            threadId: id, // panelId is the same as threadId
            modelId: model,
            messages: toSave.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              attachments: msg.attachments || [],
              metadata: msg.metadata as MessageMetadata,
              status: msg.status,
              createdAt: msg.createdAt,
            })),
          },
          {
            onError: (error) => {
              console.error("Failed to save messages:", error);
              // Keep ids marked as saved to avoid infinite retry loop
            },
          }
        );
      }

      setCurrentChat((currentChat) => {
        return {
          ...currentChat,
          dirty: false,
        };
      });
    }
  }, [
    chatId,
    id,
    isDirty,
    messages,
    model,
    userId,
    setCurrentChat,
    saveMessagesMutation,
    utils.chats.listChats,
  ]);

  return {
    isSaving: saveMessagesMutation.isPending,
    saveError: saveMessagesMutation.error,
  };
};
