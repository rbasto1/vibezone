import type { CreateAppendMessage } from "@assistant-ui/react";
import { generateId } from "ai";
import { atom, useAtom } from "jotai";
import { useCallback } from "react";

type AskAnotherRequest = {
  id: string;
  message: CreateAppendMessage;
};

type AskAnotherState = Record<string, AskAnotherRequest>;

const askAnotherRequestsAtom = atom<AskAnotherState>({});

export const useQueueAskAnotherRequest = () => {
  const [, setRequests] = useAtom(askAnotherRequestsAtom);
  return useCallback(
    (threadId: string, message: CreateAppendMessage) => {
      setRequests((prev) => ({
        ...prev,
        [threadId]: { id: generateId(), message },
      }));
    },
    [setRequests]
  );
};

export const useAskAnotherRequest = (threadId: string) => {
  const [requests, setRequests] = useAtom(askAnotherRequestsAtom);
  const request = requests[threadId];

  const clear = useCallback(() => {
    setRequests((prev) => {
      if (!prev[threadId]) return prev;
      const { [threadId]: _, ...rest } = prev;
      return rest;
    });
  }, [setRequests, threadId]);

  return { request, clear };
};
