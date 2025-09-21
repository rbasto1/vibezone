import { attachmentsAtom } from "@/store/attachments";
import type { Attachment, CompleteAttachment } from "@assistant-ui/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

export const useAppendAttachments = () => {
  const { adapter } = useAtomValue(attachmentsAtom);
  const set = useSetAtom(attachmentsAtom);

  const appendAttachments = useCallback(
    async (list: FileList) => {
      for (const file of list) {
        const attachment = await adapter.add({ file });
        if (!("file" in attachment)) {
          throw new Error("Attachment is not supported");
        }

        set((prev) => ({
          ...prev,
          attachments: prev.attachments.concat(attachment),
        }));
        adapter.send(attachment).then((attachment) => {
          set((prev) => ({
            ...prev,
            attachments: prev.attachments.map((a) =>
              a.id === attachment.id ? attachment : a
            ),
          }));
        });
      }
    },
    [adapter, set]
  );

  return appendAttachments;
};

export const useAttachmentsValue = () => {
  const { attachments } = useAtomValue(attachmentsAtom);
  return attachments;
};

export const useCompleteAttachmentsValue = () => {
  const completeAttachments = useAtomValue(attachmentsAtom);
  if (
    completeAttachments.attachments.some((a) => a.status.type !== "complete")
  ) {
    return null;
  }
  return completeAttachments.attachments as CompleteAttachment[];
};

export const useAttachmentAdapter = () => {
  const { adapter } = useAtomValue(attachmentsAtom);
  return adapter;
};

export const useRemoveAttachment = () => {
  const { adapter } = useAtomValue(attachmentsAtom);
  const set = useSetAtom(attachmentsAtom);
  return useCallback(
    (attachment: Attachment) => {
      adapter.remove(attachment);
      set((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((a) => a.id !== attachment.id),
      }));
    },
    [adapter, set]
  );
};
