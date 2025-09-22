import { attachmentsAtom } from "@/store/attachments";
import type {
  Attachment,
  AttachmentAdapter,
  CompleteAttachment,
  ImageMessagePart,
} from "@assistant-ui/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const useAppendAttachments = () => {
  const { adapter } = useAtomValue(attachmentsAtom);
  const set = useSetAtom(attachmentsAtom);

  const appendAttachments = useCallback(
    async (list: FileList) => {
      for (const file of list) {
        const attachment = await getAttachmentForFile(adapter, file);
        if (!attachment) {
          continue;
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

async function getAttachmentForFile(adapter: AttachmentAdapter, file: File) {
  try {
    const attachment = await adapter.add({ file });
    if (!("file" in attachment)) {
      toast.error(`Operation failed`);
      return null;
    }
    return attachment;
  } catch (error) {
    console.error(error);
    toast.error(`File ${file.name} is not supported`);
    return null;
  }
}

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

export const useClearAttachments = () => {
  const set = useSetAtom(attachmentsAtom);
  return useCallback(
    () =>
      set(({ adapter, attachments }) => {
        attachments.forEach((attachment) => adapter.remove(attachment));
        return { adapter, attachments: [] };
      }),
    [set]
  );
};

export const useAttachmentSrc = (attachment: Attachment) => {
  const { file, src } = useMemo(() => {
    if (attachment.type !== "image") return {};
    if (attachment.file) return { file: attachment.file };
    const src = attachment.content?.filter(
      (c): c is ImageMessagePart => c.type === "image"
    )[0]?.image;
    if (!src) return {};
    return { src };
  }, [attachment]);

  return useFileSrc(file) ?? src;
};

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    if (!file) {
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return src;
};
