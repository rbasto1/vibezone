import "server-only";

import { auth } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth-client";
import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import superjson from "superjson";

export const t = initTRPC
  .context<{
    user?: AuthUser;
  }>()
  .create({
    transformer: superjson,
  });

export const router = t.router;
export const publicProcedure = t.procedure;
export const authenticatedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});


export const createContext = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return {
      user: session?.user,
    };
  } catch {
    return {
      user: undefined,
    };
  }
};

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  if (!ctx.user.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to access this resource",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
