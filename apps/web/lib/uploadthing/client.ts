"use client";

import { generateReactHelpers } from "@uploadthing/react";

import type { AttachmentFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<AttachmentFileRouter>();
