import { CompositeAttachmentAdapter } from "@assistant-ui/react";
import { PdfAttachmentAdapter } from "./pdf-adapter";
import { TextAttachmentAdapter } from "./text-adapter";
import { VisionImageAttachmentAdapter } from "./vision-image-adapter";

export const createAttachmentAdapter = () =>
  new CompositeAttachmentAdapter([
    new VisionImageAttachmentAdapter(),
    new PdfAttachmentAdapter(),
    new TextAttachmentAdapter(),
  ]);
