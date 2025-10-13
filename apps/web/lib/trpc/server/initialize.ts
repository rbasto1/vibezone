import "server-only";

import { isUserAdmin } from "@/lib/admin";
import type { currentUser } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

export const t = initTRPC
  .context<{ user: Awaited<ReturnType<typeof currentUser>> }>()
  .create({
    transformer: superjson,
  });

export const router = t.router;
export const publicProcedure = t.procedure;
export const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const user = ctx.user;
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }
  return next();
});

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const user = ctx.user;
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  if (!isUserAdmin(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to access this resource",
    });
  }

  return next();
});
