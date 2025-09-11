import { generatePanelId } from "@/lib/id";
import { atom } from "jotai";

// Chat configuration atom
export interface ChatConfig {
  id: string;
  createdAt: Date;
  title?: string;
}

// Generate initial chat ID
const generateChatId = () => generatePanelId();

// Current chat atom - always has a chat ID
export const currentChatAtom = atom<ChatConfig>({
  id: generateChatId(),
  createdAt: new Date(),
});

// Helper atom to create new chat
export const newChatAtom = atom(null, (get, set) => {
  const newChat: ChatConfig = {
    id: generateChatId(),
    createdAt: new Date(),
  };
  set(currentChatAtom, newChat);
  set(resetMessageSaversAtom, (prev) => prev + 1); // Signal reset
  return newChat;
});

// Reset signal atom for message savers
export const resetMessageSaversAtom = atom(0);
