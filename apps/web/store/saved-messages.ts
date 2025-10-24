import { useCallback } from "react";

export const savedMessagesSet = new Set<string>();

export function useSavedMessagesValue() {
  return savedMessagesSet;
}

export function useSavedMessagesAppend() {
  return useCallback(
    (messageId: string) => savedMessagesSet.add(messageId),
    []
  );
}

export function useSavedMessages() {
  return [savedMessagesSet, useSavedMessagesAppend()] as const;
}
