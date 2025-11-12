import {
  type ThreadRuntimeController,
  threadRuntimeControllersAtom,
} from "@/store/thread-runtime-controllers";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

export const useThreadRuntimeControllers = () =>
  useAtom(threadRuntimeControllersAtom);

export const useThreadRuntimeControllersValue = () =>
  useAtomValue(threadRuntimeControllersAtom);

export const useThreadRuntimeControllerSetter = () => {
  const setControllers = useSetAtom(threadRuntimeControllersAtom);
  return useCallback(
    (threadId: string, controller: ThreadRuntimeController | null) => {
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
    },
    [setControllers]
  );
};
