import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import "server-only";

import { appRouter } from "@/lib/trpc/server/server";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
  });

export { handler as GET, handler as POST };
