import "server-only";

import { db } from "@/db";
import { providers, providerTiers } from "@/db/schema";
import { adminProcedure, t } from "@/lib/trpc/server/initialize";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

export async function getProvidersList() {
  return await db
    .select()
    .from(providers)
    .where(isNull(providers.deletedAt))
    .orderBy(asc(providers.order), asc(providers.name));
}

const TierSchema = z.enum(providerTiers.enumValues);

export const providersRouter = t.router({
  list: adminProcedure.query(getProvidersList),
  update: adminProcedure
    .input(
      z
        .object({
          id: z.string().min(1),
          tier: TierSchema.optional(),
          name: z.string().min(1).max(200).optional(),
          order: z.number().int().nullable().optional(),
        })
        .refine(
          (v) =>
            typeof v.tier !== "undefined" ||
            typeof v.name !== "undefined" ||
            typeof v.order !== "undefined",
          {
            message: "At least one of tier, name, or order must be provided",
            path: ["tier"],
          }
        )
    )
    .mutation(async ({ input }) => {
      const updates: Record<string, unknown> = {
        updatedAt: sql`current_timestamp`,
      };
      if (typeof input.tier !== "undefined") updates.tier = input.tier;
      if (typeof input.name !== "undefined") updates.name = input.name;
      if (typeof input.order !== "undefined") updates.order = input.order;
      await db.update(providers).set(updates).where(eq(providers.id, input.id));
      return { ok: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await db
        .update(providers)
        .set({
          deletedAt: sql`current_timestamp`,
          updatedAt: sql`current_timestamp`,
        })
        .where(eq(providers.id, input.id));
      return { ok: true } as const;
    }),
});
