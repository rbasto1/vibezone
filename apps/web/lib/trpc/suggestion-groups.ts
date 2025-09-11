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

  addModel: adminProcedure
    .input(
      z.object({
        groupId: z.string().nonempty(),
        modelId: z.string().nonempty(),
      })
    )
    .mutation(async ({ input }) => {
      const group = await db.query.suggestionGroups.findFirst({
        where: eq(suggestionGroups.id, input.groupId),
      });

      if (!group) {
        throw new Error("Suggestion group not found");
      }

      if (group.models.includes(input.modelId)) {
        return { ok: true } as const; // Already exists
      }

      const updatedModels = [...group.models, input.modelId];

      await db
        .update(suggestionGroups)
        .set({
          models: updatedModels,
          updatedAt: sql`current_timestamp`,
        })
        .where(eq(suggestionGroups.id, input.groupId));

      return { ok: true } as const;
    }),

  removeModel: adminProcedure
    .input(
      z.object({
        groupId: z.string().nonempty(),
        modelId: z.string().nonempty(),
      })
    )
    .mutation(async ({ input }) => {
      const group = await db.query.suggestionGroups.findFirst({
        where: eq(suggestionGroups.id, input.groupId),
      });

      if (!group) {
        throw new Error("Suggestion group not found");
      }

      const updatedModels = group.models.filter((id) => id !== input.modelId);

      await db
        .update(suggestionGroups)
        .set({
          models: updatedModels,
          updatedAt: sql`current_timestamp`,
        })
        .where(eq(suggestionGroups.id, input.groupId));

      return { ok: true } as const;
    }),

  reorderModels: adminProcedure
    .input(
      z.object({
        groupId: z.string().nonempty(),
        modelIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(suggestionGroups)
        .set({
          models: input.modelIds,
          updatedAt: sql`current_timestamp`,
        })
        .where(eq(suggestionGroups.id, input.groupId));

      return { ok: true } as const;
    }),
});
