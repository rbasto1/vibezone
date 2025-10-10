import { createAttachmentAdapter } from "@/lib/attachments/attachments";
import type { Attachment, AttachmentAdapter } from "@assistant-ui/react";
import { atom } from "jotai";

interface AttachmentsAtom {
  adapter: AttachmentAdapter;
  attachments: Attachment[];
}

export const attachmentsAtom = atom<AttachmentsAtom>({
  adapter: createAttachmentAdapter(),
  attachments: [],
});
