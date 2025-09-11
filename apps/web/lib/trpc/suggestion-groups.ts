import "server-only";

import { db } from "@/db";
import { suggestionGroups } from "@/db/schema";
import {
  adminProcedure,
  publicProcedure,
  t,
} from "@/lib/trpc/server/initialize";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

export const suggestionGroupsRouter = t.router({
  list: publicProcedure.query(async () => {
    return await db.query.suggestionGroups.findMany({
      orderBy: [asc(suggestionGroups.id)],
    });
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().nonempty(),
        title: z.string().optional(),
        label: z.string().optional(),
        icon: z.string().optional(),
        promoted: z.boolean().optional(),
        models: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await db
        .update(suggestionGroups)
        .set({
          ...rest,
          updatedAt: sql`current_timestamp`,
        })
        .where(eq(suggestionGroups.id, id));
      return { ok: true } as const;
    }),

  create: adminProcedure
    .input(
      z.object({
        id: z.string().nonempty(),
        title: z.string().nonempty(),
        label: z.string().nonempty(),
        icon: z.string().nonempty(),
        promoted: z.boolean().default(false),
        models: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      await db.insert(suggestionGroups).values(input);
      return { ok: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().nonempty() }))
    .mutation(async ({ input }) => {
      await db
        .delete(suggestionGroups)
        .where(eq(suggestionGroups.id, input.id));
      return { ok: true } as const;
    }),
});
