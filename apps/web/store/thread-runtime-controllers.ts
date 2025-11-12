import { atom } from "jotai";

import type {
  AssistantRuntime,
  CreateAppendMessage,
} from "@assistant-ui/react";

export interface ThreadRuntimeController {
  runtime: AssistantRuntime;
  append: (message: CreateAppendMessage) => void;
  cancel: () => void;
}

export type ThreadRuntimeControllersState = Record<
  string,
  ThreadRuntimeController
>;

export const threadRuntimeControllersAtom = atom<ThreadRuntimeControllersState>(
  {}
);
