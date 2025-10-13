import "server-only";

import { db } from "@/db";
import type { Preferences } from "@/db/schema";
import { chats, models, usage, usersModels } from "@/db/schema";
import { preferences, userStats } from "@/db/tables";
import { currentUser } from "@clerk/nextjs/server";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  min,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { MAX_PANELS } from "../constants";
import {
  adminProcedure,
  authenticatedProcedure,
  publicProcedure,
  t,
} from "./server/initialize";
import { syncUsers } from "./users-sync";

export const usersRouter = t.router({
  manageList: adminProcedure.query(async () => {
    const syncUsersPromise = syncUsers();

    const costCalculationBeforeDtPromise = db
      .select({
        date: min(usage.createdAt),
      })
      .from(usage)
      .where(isNull(usage.costPrompt))
      .then((rows) => rows[0]?.date ?? null);

    const lastSevenDays = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const lastThirtyDays = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

    const costQuery = db
      .select({
        userId: usage.userId,
        continents: sql<
          string[] | null
        >`array_agg(distinct ${usage.geo}->>'continent')`.as("continents"),
        countries: sql<
          string[] | null
        >`array_agg(distinct ${usage.geo}->>'country')`.as("countries"),
        totalCost30:
          sql<number>`coalesce(sum(${usage.costPrompt} + ${usage.costCompletion}), 0)::numeric`.as(
            "totalCost30"
          ),
        totalCost7:
          sql<number>`coalesce(sum(case when ${usage.createdAt} >= ${lastSevenDays} then ${usage.costPrompt} + ${usage.costCompletion} else 0 end), 0)::numeric`.as(
            "totalCost7"
          ),
      })
      .from(usage)
      .where(gte(usage.createdAt, lastThirtyDays))
      .groupBy(usage.userId)
      .as("u30");

    await syncUsersPromise;
    const usersRows = await db
      .select({
        id: userStats.id,
        name: userStats.firstName,
        email: userStats.email,
        createdAt: userStats.createdAt,
        continents: costQuery.continents,
        countries: costQuery.countries,
        lastLoginAt: userStats.lastSignInAt,
        lastActiveAt: userStats.lastActiveAt,
        chatsCount: count(sql`distinct ${chats.id}`),
        completionsCount: count(sql`distinct ${usage.id}`),
        activeDaysCount: sql<number>`count(distinct date_trunc('day', ${usage.createdAt}))::int`,
        costLast30: costQuery.totalCost30,
        costLast7: costQuery.totalCost7,
      })
      .from(userStats)
      .leftJoin(
        chats,
        and(
          eq(chats.userId, userStats.id),
          gte(chats.lastMessageAt, lastSevenDays)
        )
      )
      .leftJoin(
        usage,
        and(eq(usage.userId, userStats.id), gte(usage.createdAt, lastSevenDays))
      )
      .leftJoinLateral(costQuery, eq(costQuery.userId, userStats.id))
      .groupBy(
        userStats.id,
        costQuery.userId,
        costQuery.totalCost30,
        costQuery.totalCost7,
        costQuery.continents,
        costQuery.countries
      )
      .orderBy(desc(userStats.createdAt))
      .catch((error) => {
        console.error(error);
        throw error;
      });

    const costCalculationBeforeDt = await costCalculationBeforeDtPromise;

    return {
      users: usersRows,
      costCalculationBeforeDt,
    };
  }),

  // Replace lastModels with the exact array in the given order,
  // filtering out invalid/deleted/non-chat models
  setLastModels: authenticatedProcedure
    .input(z.object({ modelIds: z.array(z.string()).max(MAX_PANELS) }))
    .mutation(async ({ input }) => {
      const authUser = await currentUser();
      if (!authUser) throw new Error("Assert: auth procedure must have user");

      if (!input.modelIds.length) {
        await db
          .update(preferences)
          .set({ lastModels: [] })
          .where(eq(preferences.userId, authUser.id));
        return { ok: true as const, lastModels: [] as string[] };
      }

      const candidates = await db
        .select({ id: models.id })
        .from(models)
        .where(
          and(
            inArray(models.id, input.modelIds),
            isNull(models.deletedAt),
            eq(models.isChat, true)
          )
        );
      const valid = new Set(candidates.map((m) => m.id));
      const ordered = input.modelIds.filter((id) => valid.has(id)).slice(0, 3);

      await db
        .update(preferences)
        .set({ lastModels: ordered })
        .where(eq(preferences.userId, authUser.id));

      return { ok: true as const, lastModels: ordered };
    }),

  favorites: publicProcedure.query(async () => {
    const user = await currentUser();
    if (!user) {
      return [];
    }

    const rows = await db
      .select({
        modelId: usersModels.modelId,
        favoritedAt: usersModels.favoritedAt,
      })
      .from(usersModels)
      .where(
        and(eq(usersModels.userId, user.id), isNotNull(usersModels.favoritedAt))
      )
      .orderBy(desc(usersModels.favoritedAt));

    return rows;
  }),

  toggleFavorite: authenticatedProcedure
    .input(
      z.object({
        modelId: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const authUser = await currentUser();
      if (!authUser) throw new Error("Assert: auth procedure must have user");

      const userId = authUser.id;

      const [existing] = await db
        .select({
          favoritedAt: usersModels.favoritedAt,
        })
        .from(usersModels)
        .where(
          and(
            eq(usersModels.userId, userId),
            eq(usersModels.modelId, input.modelId)
          )
        )
        .limit(1);

      if (!existing) {
        const [inserted] = await db
          .insert(usersModels)
          .values({
            userId,
            modelId: input.modelId,
            favoritedAt: new Date(),
          })
          .returning({ favoritedAt: usersModels.favoritedAt });

        return {
          ok: true as const,
          favorited: true as const,
          favoritedAt: inserted?.favoritedAt ?? new Date(),
        };
      }

      if (existing.favoritedAt) {
        await db
          .update(usersModels)
          .set({ favoritedAt: null })
          .where(
            and(
              eq(usersModels.userId, userId),
              eq(usersModels.modelId, input.modelId)
            )
          );
        return {
          ok: true as const,
          favorited: false as const,
          favoritedAt: null,
        };
      }

      const [updated] = await db
        .update(usersModels)
        .set({ favoritedAt: new Date() })
        .where(
          and(
            eq(usersModels.userId, userId),
            eq(usersModels.modelId, input.modelId)
          )
        )
        .returning({ favoritedAt: usersModels.favoritedAt });

      return {
        ok: true as const,
        favorited: true as const,
        favoritedAt: updated?.favoritedAt ?? new Date(),
      };
    }),

  updatePreferences: authenticatedProcedure
    .input(
      z.object({
        autoScroll: z.boolean().optional(),
        hiddenProviders: z.array(z.string()).optional(),
        systemPrompt: z.string().max(4000).nullable().optional(),
        webSearch: z.boolean().optional(),
        reasoningEffort: z.enum(["none", "low", "medium", "high"]).optional(),
        skipCloseThreadConfirmation: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const authUser = await currentUser();
      if (!authUser) throw new Error("Assert: auth procedure must have user");

      const sanitizedHiddenProviders = input.hiddenProviders
        ? Array.from(
            new Set(
              input.hiddenProviders
                .map((id) => id.trim())
                .filter((id) => id.length > 0)
            )
          ).sort((a, b) => a.localeCompare(b))
        : undefined;

      const hiddenSet = sanitizedHiddenProviders
        ? new Set(sanitizedHiddenProviders)
        : undefined;

      const [current] = hiddenSet
        ? await db
            .select({ lastModels: preferences.lastModels })
            .from(preferences)
            .where(eq(preferences.userId, authUser.id))
            .limit(1)
        : [];

      const currentLastModels = current?.lastModels ?? [];
      const filteredLastModels = hiddenSet
        ? !hiddenSet.size
          ? currentLastModels
          : currentLastModels.filter((modelId) => {
              const providerId = modelId.split("/")[0];
              return providerId && !hiddenSet.has(providerId);
            })
        : undefined;

      const updatePayload: Partial<Preferences> = {
        preferenceAutoScroll: input.autoScroll,
        preferenceHiddenProviders: sanitizedHiddenProviders,
        preferenceSystemPrompt: input.systemPrompt,
        preferenceSystemPromptChangedAt: input.systemPrompt
          ? new Date()
          : undefined,
        preferenceWebSearch: input.webSearch,
        preferenceReasoningEffort: input.reasoningEffort,
        preferenceSkipCloseThreadConfirmation:
          input.skipCloseThreadConfirmation,
      };

      if (
        filteredLastModels &&
        hiddenSet?.size &&
        filteredLastModels.length !== currentLastModels.length
      ) {
        Object.assign(updatePayload, { lastModels: filteredLastModels });
      }

      await db
        .update(preferences)
        .set(updatePayload)
        .where(eq(preferences.userId, authUser.id));

      return {
        ok: true as const,
        preferences: {
          autoScroll: input.autoScroll,
          hiddenProviders: sanitizedHiddenProviders,
          systemPrompt: input.systemPrompt,
          webSearch: input.webSearch,
          reasoningEffort: input.reasoningEffort,
          skipCloseThreadConfirmation: input.skipCloseThreadConfirmation,
          lastModels:
            "lastModels" in updatePayload
              ? filteredLastModels
              : currentLastModels,
        },
      };
    }),

  syncUsers: adminProcedure.mutation(async () => {
    await syncUsers();
    return { ok: true };
  }),
});
