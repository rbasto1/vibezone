import "server-only";

import { db } from "@/db";
import { providers } from "@/db/schema";
import { publicProcedure, t } from "@/lib/trpc/server/initialize";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

export async function getProvidersList() {
  return await db.select().from(providers).orderBy(asc(providers.name));
}

const TierSchema = z.enum(["leaders", "challengers", "specialists"]);

export const providersRouter = t.router({
  list: publicProcedure.query(getProvidersList),
  update: publicProcedure
    .input(
      z
        .object({
          id: z.string().min(1),
          tier: TierSchema.optional(),
          name: z.string().min(1).max(200).optional(),
        })
        .refine(
          (v) => typeof v.tier !== "undefined" || typeof v.name !== "undefined",
          {
            message: "At least one of tier or name must be provided",
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
      await db.update(providers).set(updates).where(eq(providers.id, input.id));
      return { ok: true } as const;
    }),
});
