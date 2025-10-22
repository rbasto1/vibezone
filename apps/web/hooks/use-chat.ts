import { generateChatId } from "@/lib/id";
import type { ChatConfig } from "@/store/chat";
import { currentChatAtom } from "@/store/chat";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

/**
 * Hook that returns the newChat atom setter function (write-only)
 * @returns setNewChat - function to create a new chat
 */
export function useNewChat() {
  const setCurrentChat = useCurrentChatSetter();
  return (projectId: string | null = null) => {
    // Helper hook to create new chat
    const newChat: ChatConfig = {
      id: generateChatId(),
      createdAt: new Date(),
      addedToList: false,
      projectId,
      fetchedTitlePanelId: null,
    };
    setCurrentChat(newChat);
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
