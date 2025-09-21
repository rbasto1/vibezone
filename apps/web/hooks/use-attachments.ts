import { attachmentsAtom } from "@/store/attachments";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

export const useAttachments = () => {
  return useAtom(attachmentsAtom);
};

export const useAttachmentsValue = () => {
  return useAtomValue(attachmentsAtom);
};

export const useAttachmentsSetter = () => {
  return useSetAtom(attachmentsAtom);
};

export const useAttachmentsAppender = () => {
  const set = useAttachmentsSetter();
  return useCallback(
    (file: FileList) => set((prev) => prev.concat(Array.from(file))),
    [set]
  );
};
