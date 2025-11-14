import { atom } from "jotai";

import type {
  AssistantRuntime,
  CreateAppendMessage,
  ThreadMessageLike,
} from "@assistant-ui/react";

export interface ThreadRuntimeController {
  runtime: AssistantRuntime;
  append: (message: CreateAppendMessage) => void;
  cancel: () => void;
  syncMessages?: (messages: ThreadMessageLike[]) => void;
}

export type ThreadRuntimeControllersState = Record<
  string,
  ThreadRuntimeController
>;

export const threadRuntimeControllersAtom = atom<ThreadRuntimeControllersState>(
  {}
);
