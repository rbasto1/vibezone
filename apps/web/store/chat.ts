import { generateChatId } from "@/lib/id";
import { atom } from "jotai";

// Chat configuration atom
export interface ChatConfig {
  id: string;
  createdAt: Date;
  addedToList: boolean;
  title?: string;
  fetchedTitlePanelId: string | null;
  firstUserMessage?: string;
}

// Current chat atom - always has a chat ID
export const currentChatAtom = atom<ChatConfig>({
  id: generateChatId(),
  createdAt: new Date(),
  addedToList: false,
  fetchedTitlePanelId: null,
});
