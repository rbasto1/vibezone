import { useCallback } from "react";

export const savedMessagesSet = new Set<string>();

export function useSavedMessagesValue() {
  return savedMessagesSet;
}

export function useSavedMessagesAppend() {
  return useCallback((messageIds: string[]) => {
    messageIds.forEach((id) => savedMessagesSet.add(id));
  }, []);
}

export function useSavedMessages() {
  return [savedMessagesSet, useSavedMessagesAppend()] as const;
}
