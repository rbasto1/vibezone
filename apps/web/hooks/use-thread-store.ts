import {
  threadMessagesAtom,
  threadRuntimeControllersAtom,
  type ThreadRuntimeController,
} from "@/store/thread-messages";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useMemo } from "react";

const createThreadMessagesAtom = (threadId: string) =>
  atom(
    (get) => get(threadMessagesAtom)[threadId] ?? ([] as ThreadMessageLike[]),
    (get, set, updater: ThreadMessageLike[] | ((prev: ThreadMessageLike[]) => ThreadMessageLike[])) => {
      const current = get(threadMessagesAtom);
      const nextMessages =
        typeof updater === "function"
          ? (updater as (prev: ThreadMessageLike[]) => ThreadMessageLike[])(
              current[threadId] ?? [],
            )
          : updater;
      set(threadMessagesAtom, {
        ...current,
        [threadId]: nextMessages,
      });
    },
  );

export const useThreadMessages = (threadId: string) => {
  const scopedAtom = useMemo(() => createThreadMessagesAtom(threadId), [threadId]);
  return useAtom(scopedAtom);
};

export const useThreadMessagesValue = (threadId: string) => {
  const scopedAtom = useMemo(() => createThreadMessagesAtom(threadId), [threadId]);
  return useAtomValue(scopedAtom);
};

export const useThreadMessagesSetter = (threadId: string) => {
  const scopedAtom = useMemo(() => createThreadMessagesAtom(threadId), [threadId]);
  return useSetAtom(scopedAtom);
};

export const useThreadRuntimeControllers = () => {
  return useAtom(threadRuntimeControllersAtom);
};

export const useThreadRuntimeControllersValue = () => {
  return useAtomValue(threadRuntimeControllersAtom);
};

export const useThreadRuntimeControllerSetter = () => {
  const setControllers = useSetAtom(threadRuntimeControllersAtom);
  return (threadId: string, controller: ThreadRuntimeController | null) => {
    setControllers((current) => {
      if (!controller) {
        const { [threadId]: _, ...rest } = current;
        return rest;
      }
      return {
        ...current,
        [threadId]: controller,
      };
    });
  };
};
