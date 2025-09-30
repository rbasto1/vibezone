import "server-only";

import { db } from "@/db";
import { locales } from "@/db/schema";
import { adminProcedure, t } from "@/lib/trpc/server/initialize";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function getLocalesList() {
  return await db.select().from(locales).orderBy(locales.id);
}

export const localesRouter = t.router({
  list: adminProcedure.query(() => getLocalesList()),

  create: adminProcedure
    .input(
      z.object({
        id: z.string().min(1).max(10),
        name: z.string().min(1).max(100),
        available: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      await db.insert(locales).values({
        id: input.id,
        name: input.name,
        available: input.available,
      });
      return { ok: true } as const;
    }),

  update: adminProcedure
    .input(
      z
        .object({
          id: z.string().min(1),
          name: z.string().min(1).max(100).optional(),
          available: z.boolean().optional(),
        })
        .refine(
          (v) =>
            typeof v.name !== "undefined" || typeof v.available !== "undefined",
          {
            message: "At least one of name or available must be provided",
            path: ["name"],
          }
        )
    )
    .mutation(async ({ input }) => {
      const updates: Record<string, unknown> = {};

      if (typeof input.name !== "undefined") updates.name = input.name;
      if (typeof input.available !== "undefined")
        updates.available = input.available;

      await db.update(locales).set(updates).where(eq(locales.id, input.id));

      return { ok: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await db.delete(locales).where(eq(locales.id, input.id));
      return { ok: true } as const;
    }),
});

// Export types
export type LocalesRouter = typeof localesRouter;
