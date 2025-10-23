import { atom, useAtom, useSetAtom } from "jotai";

import { useUserMessageSaver } from "@/hooks/use-user-message-saver";
import type { MessageState } from "@assistant-ui/react";
import { useCallback } from "react";
import { useSavedMessages } from "./saved-messages";

export interface PendingUserMessageInfo {
  message: MessageState;
  threadId: string;
  modelId: string;
}

export type PendingUserMessagesAtom = PendingUserMessageInfo[];

export const pendingUserMessagesAtom = atom<PendingUserMessagesAtom>([]);

export function usePendingUserMessages() {
  return useAtom(pendingUserMessagesAtom);
}

export function usePendingUserMessagesClear() {
  const set = useSetAtom(pendingUserMessagesAtom);
  return useCallback(() => set([]), [set]);
}

export function usePendingUserMessagesAppender() {
  const set = useSetAtom(pendingUserMessagesAtom);
  const [savedMessages, appendSavedMessages] = useSavedMessages();
  const save = useUserMessageSaver();

  return useCallback(
    (message: MessageState, threadId: string, modelId: string) => {
      if (savedMessages.has(message.id)) return;
      console.log("message not saved, adding to pending");
      appendSavedMessages([message.id]);
      set((prev) => {
        if (prev.some((m) => m.message.id === message.id)) {
          console.log("message already in pending");
          return prev;
        }
        const next = prev.concat({ message, threadId, modelId });
        console.log(`triggering save with ${next.length} messages`);
        save(next);
        return next;
      });
    },
    [set, savedMessages, appendSavedMessages, save]
  );
}
