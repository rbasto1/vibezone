import { atom } from "jotai";

import type { ThreadMessageLike } from "@assistant-ui/react";

export type ThreadMessagesState = Record<string, ThreadMessageLike[]>;

export const threadMessagesAtom = atom<ThreadMessagesState>({});
