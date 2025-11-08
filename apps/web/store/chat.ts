import { generateChatId } from "@/lib/id";
import { atom } from "jotai";

// Chat configuration atom
export interface ChatConfig {
  id: string;
  createdAt: Date;
  addedToList: boolean;
  projectId: string | null;
  title?: string;
}

// Current chat atom - always has a chat ID
export const currentChatAtom = atom<ChatConfig>({
  id: generateChatId(),
  createdAt: new Date(),
  addedToList: false,
  projectId: null,
});
