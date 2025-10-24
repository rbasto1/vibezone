import { atom, useSetAtom } from "jotai";

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

const pendingUserMessagesAtom = atom<PendingUserMessagesAtom>([]);

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
      appendSavedMessages(message.id);
      set((prev) => {
        if (prev.some((m) => m.message.id === message.id)) {
          return prev;
        }
        const next = prev.concat({ message, threadId, modelId });
        save(next);
        return next;
      });
    },
    [set, savedMessages, appendSavedMessages, save]
  );
}
