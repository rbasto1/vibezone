import type {
  AssistantRuntime,
  CreateAppendMessage,
  ThreadMessageLike,
} from "@assistant-ui/react";
import { atom } from "jotai";

export type ThreadMessagesState = Record<string, ThreadMessageLike[]>;

export const threadMessagesAtom = atom<ThreadMessagesState>({});

export interface ThreadRuntimeController {
  runtime: AssistantRuntime;
  append: (message: CreateAppendMessage) => void;
  cancel: () => void;
}

export type ThreadRuntimeControllersState = Record<
  string,
  ThreadRuntimeController
>;

export const threadRuntimeControllersAtom =
  atom<ThreadRuntimeControllersState>({});
