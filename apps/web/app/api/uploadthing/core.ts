import { currentUser } from "@clerk/nextjs/server";
import { createUploadthing } from "uploadthing/next";
import type { FileRouter } from "uploadthing/types";

const f = createUploadthing();

const MAX_ATTACHMENT_SIZE = "8MB" as const;
const MAX_ATTACHMENT_COUNT = 5;

export const attachmentFileRouter = {
  messageAttachment: f(
    {
      blob: {
        maxFileSize: MAX_ATTACHMENT_SIZE,
        maxFileCount: MAX_ATTACHMENT_COUNT,
      },
    },
    { awaitServerData: true }
  )
    .middleware(async () => {
      const user = await currentUser();
      if (!user) {
        throw new Error("Unauthorized");
      }
      return { userId: user.id };
    })
    .onUploadComplete(({ file, metadata }) => ({
      uploadedBy: metadata.userId,
      fileUrl: file.ufsUrl,
      fileKey: file.key,
      size: file.size,
      name: file.name,
      contentType: file.type,
    })),
} satisfies FileRouter;

export type AttachmentFileRouter = typeof attachmentFileRouter;
