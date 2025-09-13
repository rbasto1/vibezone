import { generateChatId } from "@/lib/id";
import { atom } from "jotai";

// Chat configuration atom
export interface ChatConfig {
  id: string;
  createdAt: Date;
  title?: string;
  fetchedTitle: boolean;
  firstUserMessage?: string;
}

// Current chat atom - always has a chat ID
export const currentChatAtom = atom<ChatConfig>({
  id: generateChatId(),
  createdAt: new Date(),
  fetchedTitle: false,
});

// Reset signal atom for message savers
export const resetMessageSaversAtom = atom(0);
