import { generateChatId } from "@/lib/id";
import type { ChatConfig } from "@/store/chat";
import { currentChatAtom, resetMessageSaversAtom } from "@/store/chat";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

/**
 * Hook that returns the newChat atom setter function (write-only)
 * @returns setNewChat - function to create a new chat
 */
export function useNewChat() {
  const setCurrentChat = useCurrentChatSetter();
  const setResetMessageSavers = useResetMessageSaversSetter();
  return () => {
    // Helper atom to create new chat
    const newChat: ChatConfig = {
      id: generateChatId(),
      createdAt: new Date(),
    };
    setCurrentChat(newChat);
    setResetMessageSavers((prev) => prev + 1); // Signal reset
    return newChat;
  };
}

export function useCurrentChat() {
  return useAtom(currentChatAtom);
}

export function useCurrentChatSetter() {
  return useSetAtom(currentChatAtom);
}

export function useCurrentChatValue() {
  return useAtomValue(currentChatAtom);
}

export function useResetMessageSaversSetter() {
  return useSetAtom(resetMessageSaversAtom);
}

export function useResetMessageSaversValue() {
  return useAtomValue(resetMessageSaversAtom);
}
