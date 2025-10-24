import {
  applyUploadMetaToAttachment,
  type UploadMeta,
} from "@/lib/attachments/storage";
import { uploadFiles } from "@/lib/uploadthing/client";
import { attachmentsAtom } from "@/store/attachments";
import type {
  Attachment,
  AttachmentAdapter,
  CompleteAttachment,
  FileMessagePart,
  ImageMessagePart,
  PendingAttachment,
} from "@assistant-ui/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ClientUploadedFileData } from "uploadthing/types";

export const useAppendAttachments = () => {
  const { adapter } = useAtomValue(attachmentsAtom);
  const set = useSetAtom(attachmentsAtom);

  const extractUploadMeta = useCallback(
    (
      uploaded: ClientUploadedFileData<UploadMeta>,
      file: File
    ): UploadMeta | null => {
      const serverData = uploaded.serverData ?? null;
      const fileUrl = serverData?.fileUrl ?? uploaded.url ?? "";
      if (!fileUrl) return null;

      return {
        fileUrl,
        fileKey: serverData?.fileKey ?? uploaded.key ?? "",
        size: serverData?.size ?? uploaded.size ?? file.size,
        contentType: serverData?.contentType ?? file.type,
        name: serverData?.name ?? uploaded.name ?? file.name,
        uploadedBy: serverData?.uploadedBy,
      };
    },
    []
  );

  const finalizeAttachment = useCallback(
    async (pending: PendingAttachment) => {
      const updateProgress = (progress: number) => {
        set((prev) => ({
          ...prev,
          attachments: prev.attachments.map((attachment) =>
            attachment.id === pending.id
              ? ({
                  ...attachment,
                  status: {
                    type: "running",
                    reason: "uploading",
                    progress: Math.min(100, Math.max(0, Math.round(progress))),
                  },
                } as PendingAttachment)
              : attachment
          ),
        }));
      };

      set((prev) => ({
        ...prev,
        attachments: prev.attachments.map((attachment) =>
          attachment.id === pending.id
            ? ({
                ...attachment,
                status: {
                  type: "running",
                  reason: "uploading",
                  progress: 0,
                },
              } as PendingAttachment)
            : attachment
        ),
      }));

      try {
        const results = await uploadFiles("messageAttachment", {
          files: [pending.file],
          onUploadProgress: ({ progress }) => {
            updateProgress(progress);
          },
        });
        const uploaded = results?.[0] as
          | ClientUploadedFileData<UploadMeta>
          | undefined;
        if (!uploaded) {
          throw new Error("Upload failed");
        }

        const meta = extractUploadMeta(uploaded, pending.file);
        if (!meta) {
          throw new Error("Upload metadata missing");
        }

        const complete = await adapter.send(pending);
        const remoteAttachment = applyUploadMetaToAttachment(
          { ...complete, file: pending.file },
          meta,
          pending.file
        );

        set((prev) => ({
          ...prev,
          attachments: prev.attachments.map((attachment) =>
            attachment.id === remoteAttachment.id
              ? remoteAttachment
              : attachment
          ),
        }));
      } catch (error) {
        console.error("Failed to upload attachment:", error);
        toast.error(`Failed to upload ${pending.name}`);
        set((prev) => ({
          ...prev,
          attachments: prev.attachments.map((attachment) =>
            attachment.id === pending.id
              ? ({
                  ...attachment,
                  status: { type: "incomplete", reason: "error" },
                } as PendingAttachment)
              : attachment
          ),
        }));
      }
    },
    [adapter, extractUploadMeta, set]
  );

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
        void finalizeAttachment(attachment as PendingAttachment);
      }
    },
    [adapter, finalizeAttachment, set]
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
    if (!(error instanceof Error)) return;
    if (error.message.startsWith("PDF size exceeds ")) {
      const msg = error.message.substring("PDF size ".length);
      toast.error(`File ${file.name} ${msg}`);
    } else {
      toast.error(`File ${file.name} is not supported`);
    }
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
      void adapter.remove(attachment);
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
    const imagePart = attachment.content?.find(
      (c): c is ImageMessagePart => c.type === "image"
    );
    if (imagePart?.image) {
      return { src: imagePart.image };
    }
    const filePart = attachment.content?.find(
      (c): c is FileMessagePart =>
        c.type === "file" &&
        typeof c.data === "string" &&
        (c.mimeType?.startsWith("image/") ?? true)
    );
    if (filePart?.data) {
      return { src: filePart.data };
    }
    return {};
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
