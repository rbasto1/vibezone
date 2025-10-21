import { createRouteHandler } from "uploadthing/next";

import { attachmentFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: attachmentFileRouter,
});
