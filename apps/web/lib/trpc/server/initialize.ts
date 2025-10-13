import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

export const t = initTRPC.create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const authenticatedProcedure = t.procedure.use(async ({ next }) => {
  const user = await currentUser();
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }
  return next();
});

export const createContext = async () => {
  try {
    return {
      user: await currentUser(),
    };
  } catch {
    return {
      user: undefined,
    };
  }
};

export const adminProcedure = t.procedure.use(async ({ next }) => {
  const { isAuthenticated, has } = await auth();
  if (!isAuthenticated) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  if (!has({ permission: "org:admin" })) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to access this resource",
    });
  }

  return next();
});
