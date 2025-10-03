import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { models } from "@/db/schema";
import {
  adminProcedure,
  publicProcedure,
  t,
} from "@/lib/trpc/server/initialize";
import { listModels, listModelsAdmin } from "./models-list";
import { syncFromOpenRouter } from "./models-sync";

export type GetModelsListReturn = Awaited<ReturnType<typeof listModels>>;

export const modelsRouter = t.router({
  list: publicProcedure.query(listModels),
  adminList: adminProcedure.query(listModelsAdmin),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().nonempty(),
        priority: z.number().int().nullable().optional(),
        isSuggested: z.boolean().optional(),
        isPremium: z.boolean().optional(),
        isIncluded: z.boolean().optional(),
        capabilityFast: z.boolean().optional(),
        capabilityEffortControl: z.boolean().optional(),
        hiddenAt: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await db.update(models).set(rest).where(eq(models.id, id));
      return { ok: true } as const;
    }),

  hide: adminProcedure
    .input(z.object({ id: z.string().nonempty() }))
    .mutation(async ({ input }) => {
      await db
        .update(models)
        .set({ hiddenAt: sql`current_timestamp` })
        .where(eq(models.id, input.id));
      return { ok: true } as const;
    }),

  syncFromOpenRouter: adminProcedure.mutation(syncFromOpenRouter),
});
