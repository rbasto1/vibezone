import "server-only";

import { db } from "@/db";
import { news, preferences } from "@/db/schema";
import {
  adminProcedure,
  authenticatedProcedure,
  t,
} from "@/lib/trpc/server/initialize";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";

export const newsRouter = t.router({
  list: adminProcedure
    .input(z.object({ includeDeleted: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const includeDeleted = input?.includeDeleted ?? false;
      if (includeDeleted) {
        return await db
          .select({
            id: news.id,
            title: news.title,
            body: news.body,
            createdAt: news.createdAt,
            updatedAt: news.updatedAt,
            deletedAt: news.deletedAt,
          })
          .from(news)
          .orderBy(desc(news.createdAt));
      }

      return await db
        .select({
          id: news.id,
          title: news.title,
          body: news.body,
          createdAt: news.createdAt,
          updatedAt: news.updatedAt,
          deletedAt: news.deletedAt,
        })
        .from(news)
        .where(isNull(news.deletedAt))
        .orderBy(desc(news.createdAt));
    }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const [created] = await db
        .insert(news)
        .values({
          title: input.title,
          body: input.body,
        })
        .returning();

      if (!created) {
        throw new Error("Failed to create news item.");
      }

      return { ok: true as const, item: created };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(news)
        .set({ title: input.title, body: input.body })
        .where(eq(news.id, input.id))
        .returning();

      if (!updated) {
        throw new Error("News item not found.");
      }

      return { ok: true as const, item: updated };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [archived] = await db
        .update(news)
        .set({ deletedAt: sql`current_timestamp` })
        .where(eq(news.id, input.id))
        .returning();

      if (!archived) {
        throw new Error("News item not found.");
      }

      return { ok: true as const, item: archived };
    }),

  restore: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [restored] = await db
        .update(news)
        .set({ deletedAt: null })
        .where(eq(news.id, input.id))
        .returning();

      if (!restored) {
        throw new Error("News item not found.");
      }

      return { ok: true as const, item: restored };
    }),

  markNewsSeen: authenticatedProcedure
    .input(z.object({ lastNewsSeenAt: z.date() }))
    .mutation(async ({ ctx, input: { lastNewsSeenAt } }) => {
      const user = ctx.user;
      if (!user) {
        throw new Error("You must be logged in to dismiss news.");
      }

      await db
        .insert(preferences)
        .values({ userId: user.id })
        .onConflictDoNothing()
        .catch((error) => {
          console.error("Failed to ensure preferences row:", error);
          throw error instanceof Error ? error : new Error(String(error));
        });

      await db
        .update(preferences)
        .set({ lastNewsSeenAt })
        .where(
          and(
            eq(preferences.userId, user.id),
            or(
              isNull(preferences.lastNewsSeenAt),
              lt(preferences.lastNewsSeenAt, lastNewsSeenAt)
            )
          )
        )
        .catch((error) => {
          console.error("Failed to update last news seen timestamp:", error);
          throw error instanceof Error ? error : new Error(String(error));
        });

      return { ok: true as const };
    }),
});
