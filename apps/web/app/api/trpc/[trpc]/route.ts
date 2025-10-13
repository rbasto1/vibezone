import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import "server-only";

import { appRouter } from "@/lib/trpc/server/server";
import { currentUser } from "@clerk/nextjs/server";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => ({
      user: await currentUser(),
    }),
    onError({ error, path, type }) {
      console.error(`Error in module ${path} (${type}):`, error);
    },
  });

export { handler as GET, handler as POST };
