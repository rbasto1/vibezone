import "server-only";

import { db } from "@/db";
import type { NewSuggestionGroup } from "@/db/schema";
import { suggestionGroups, suggestionGroupTranslations } from "@/db/schema";
import {
  adminProcedure,
  publicProcedure,
  t,
} from "@/lib/trpc/server/initialize";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

export const suggestionGroupsRouter = t.router({
  list: publicProcedure.query(listSuggestionGroups),

  reorder: adminProcedure
    .input(
      z.object({
        groupIds: z.array(z.string().nonempty()),
      })
    )
    .mutation(async ({ input }) => {
      const { groupIds } = input;

      if (!groupIds.length) {
        return { ok: true } as const;
      }

      const fakeInsert = groupIds.map<NewSuggestionGroup>((id, index) => ({
        id,
        order: index,
        icon: "",
        models: [],
        title: "",
        label: "",
      }));

      await db
        .insert(suggestionGroups)
        .values(fakeInsert)
        .onConflictDoUpdate({
          target: suggestionGroups.id,
          set: {
            order: sql`EXCLUDED.order`,
          },
        });

      return { ok: true } as const;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().nonempty(),
        newId: z.string().optional(),
        title: z.string().optional(),
        label: z.string().optional(),
        icon: z.string().optional(),
        promoted: z.boolean().optional(),
        models: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, newId, ...rest } = input;

      if (newId && newId !== id) {
        // Check if the new ID already exists
        const existingGroup = await db.query.suggestionGroups.findFirst({
          where: eq(suggestionGroups.id, newId),
        });

        if (existingGroup) {
          throw new Error("A group with this ID already exists");
        }

        // Update with new ID
        await db
          .update(suggestionGroups)
          .set({
            id: newId,
            ...rest,
            updatedAt: sql`current_timestamp`,
          })
          .where(eq(suggestionGroups.id, id));
      } else {
        // Regular update without ID change
        await db
          .update(suggestionGroups)
          .set({
            ...rest,
            updatedAt: sql`current_timestamp`,
          })
          .where(eq(suggestionGroups.id, id));
      }

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

  listTranslations: adminProcedure
    .input(z.object({ suggestionGroupId: z.string().nonempty() }))
    .query(async ({ input }) => {
      return await db.query.suggestionGroupTranslations.findMany({
        where: eq(
          suggestionGroupTranslations.suggestionGroupId,
          input.suggestionGroupId
        ),
        orderBy: [asc(suggestionGroupTranslations.localeId)],
      });
    }),

  updateTranslation: adminProcedure
    .input(
      z.object({
        suggestionGroupId: z.string().nonempty(),
        localeId: z.string().nonempty(),
        title: z.string(),
        label: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .insert(suggestionGroupTranslations)
        .values({
          suggestionGroupId: input.suggestionGroupId,
          localeId: input.localeId,
          title: input.title,
          label: input.label,
        })
        .onConflictDoUpdate({
          target: [
            suggestionGroupTranslations.suggestionGroupId,
            suggestionGroupTranslations.localeId,
          ],
          set: {
            title: input.title,
            label: input.label,
          },
        });

      return { ok: true } as const;
    }),

  deleteTranslation: adminProcedure
    .input(
      z.object({
        suggestionGroupId: z.string().nonempty(),
        localeId: z.string().nonempty(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .delete(suggestionGroupTranslations)
        .where(
          and(
            eq(
              suggestionGroupTranslations.suggestionGroupId,
              input.suggestionGroupId
            ),
            eq(suggestionGroupTranslations.localeId, input.localeId)
          )
        );
      return { ok: true } as const;
    }),
});

export async function listSuggestionGroups() {
  return await db.query.suggestionGroups.findMany({
    orderBy: [
      sql`coalesce(${suggestionGroups.order}, 2147483647)`,
      asc(suggestionGroups.id),
    ],
  });
}
