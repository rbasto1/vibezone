import "server-only";

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

import type { Preferences, ReasoningEffort } from "@/db";
import {
  chats as chatsTable,
  db,
  models as modelsTable,
  preferences as preferencesTable,
  projects as projectsTable,
  usage as usageTable,
  usersModels as usersModelsTable,
  userStats as userStatsTable,
} from "@/db";
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
        date: min(usageTable.createdAt),
      })
      .from(usageTable)
      .where(isNull(usageTable.costPrompt))
      .then((rows) => rows[0]?.date ?? null);

    const lastSevenDays = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const lastThirtyDays = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

    const costQuery = db
      .select({
        userId: usageTable.userId,
        continents: sql<
          string[] | null
        >`array_agg(distinct ${usageTable.geo}->>'continent')`.as("continents"),
        countries: sql<
          string[] | null
        >`array_agg(distinct ${usageTable.geo}->>'country')`.as("countries"),
        totalCost30:
          sql<number>`coalesce(sum(${usageTable.costPrompt} + ${usageTable.costCompletion}), 0)::numeric`.as(
            "totalCost30"
          ),
        totalCost7:
          sql<number>`coalesce(sum(case when ${usageTable.createdAt} >= ${lastSevenDays} then ${usageTable.costPrompt} + ${usageTable.costCompletion} else 0 end), 0)::numeric`.as(
            "totalCost7"
          ),
      })
      .from(usageTable)
      .where(gte(usageTable.createdAt, lastThirtyDays))
      .groupBy(usageTable.userId)
      .as("u30");

    await syncUsersPromise;
    const usersRows = await db
      .select({
        id: userStatsTable.id,
        name: userStatsTable.firstName,
        email: userStatsTable.email,
        createdAt: userStatsTable.createdAt,
        continents: costQuery.continents,
        countries: costQuery.countries,
        lastLoginAt: userStatsTable.lastSignInAt,
        lastActiveAt: userStatsTable.lastActiveAt,
        chatsCount: count(sql`distinct ${chatsTable.id}`),
        completionsCount: count(sql`distinct ${usageTable.id}`),
        activeDaysCount: sql<number>`count(distinct date_trunc('day', ${usageTable.createdAt}))::int`,
        costLast30: costQuery.totalCost30,
        costLast7: costQuery.totalCost7,
      })
      .from(userStatsTable)
      .leftJoin(
        projectsTable,
        and(
          eq(projectsTable.userId, userStatsTable.id),
          isNull(projectsTable.deletedAt)
        )
      )
      .leftJoin(
        chatsTable,
        and(
          eq(chatsTable.projectId, projectsTable.id),
          gte(chatsTable.lastMessageAt, lastSevenDays),
          isNull(chatsTable.deletedAt)
        )
      )
      .leftJoin(
        usageTable,
        and(
          eq(usageTable.userId, userStatsTable.id),
          gte(usageTable.createdAt, lastSevenDays)
        )
      )
      .leftJoinLateral(costQuery, eq(costQuery.userId, userStatsTable.id))
      .groupBy(
        userStatsTable.id,
        costQuery.userId,
        costQuery.totalCost30,
        costQuery.totalCost7,
        costQuery.continents,
        costQuery.countries
      )
      .orderBy(desc(userStatsTable.createdAt))
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
    .mutation(async ({ ctx, input }) => {
      const authUser = ctx.user;
      if (!authUser) throw new Error("Assert: auth procedure must have user");

      if (!input.modelIds.length) {
        await db
          .update(preferencesTable)
          .set({ lastModels: [] })
          .where(eq(preferencesTable.userId, authUser.id));
        return { ok: true as const, lastModels: [] as string[] };
      }

      const candidates = await db
        .select({ id: modelsTable.id })
        .from(modelsTable)
        .where(
          and(
            inArray(modelsTable.id, input.modelIds),
            isNull(modelsTable.deletedAt),
            eq(modelsTable.isChat, true)
          )
        );
      const valid = new Set(candidates.map((m) => m.id));
      const ordered = input.modelIds.filter((id) => valid.has(id)).slice(0, 3);

      await db
        .update(preferencesTable)
        .set({ lastModels: ordered })
        .where(eq(preferencesTable.userId, authUser.id));

      return { ok: true as const, lastModels: ordered };
    }),

  favorites: publicProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) {
      return [];
    }

    const rows = await db
      .select({
        modelId: usersModelsTable.modelId,
        favoritedAt: usersModelsTable.favoritedAt,
      })
      .from(usersModelsTable)
      .where(
        and(
          eq(usersModelsTable.userId, user.id),
          isNotNull(usersModelsTable.favoritedAt)
        )
      )
      .orderBy(desc(usersModelsTable.favoritedAt));

    return rows;
  }),

  toggleFavorite: authenticatedProcedure
    .input(
      z.object({
        modelId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const authUser = ctx.user;
      if (!authUser) throw new Error("Assert: auth procedure must have user");

      const userId = authUser.id;

      const [existing] = await db
        .select({
          favoritedAt: usersModelsTable.favoritedAt,
        })
        .from(usersModelsTable)
        .where(
          and(
            eq(usersModelsTable.userId, userId),
            eq(usersModelsTable.modelId, input.modelId)
          )
        )
        .limit(1);

      if (!existing) {
        const [inserted] = await db
          .insert(usersModelsTable)
          .values({
            userId,
            modelId: input.modelId,
            favoritedAt: new Date(),
          })
          .returning({ favoritedAt: usersModelsTable.favoritedAt });

        return {
          ok: true as const,
          favorited: true as const,
          favoritedAt: inserted?.favoritedAt ?? new Date(),
        };
      }

      if (existing.favoritedAt) {
        await db
          .update(usersModelsTable)
          .set({ favoritedAt: null })
          .where(
            and(
              eq(usersModelsTable.userId, userId),
              eq(usersModelsTable.modelId, input.modelId)
            )
          );
        return {
          ok: true as const,
          favorited: false as const,
          favoritedAt: null,
        };
      }

      const [updated] = await db
        .update(usersModelsTable)
        .set({ favoritedAt: new Date() })
        .where(
          and(
            eq(usersModelsTable.userId, userId),
            eq(usersModelsTable.modelId, input.modelId)
          )
        )
        .returning({ favoritedAt: usersModelsTable.favoritedAt });

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
        webSearch: z.boolean().optional(),
        reasoningEffort: z.enum(["none", "low", "medium", "high"]).optional(),
        enterKeySends: z.boolean().optional(),
        shiftEnterKeySends: z.boolean().optional(),
        skipCloseThreadConfirmation: z.boolean().optional(),
        hideLegal: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const authUser = ctx.user;
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
            .select({ lastModels: preferencesTable.lastModels })
            .from(preferencesTable)
            .where(eq(preferencesTable.userId, authUser.id))
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
        preferenceWebSearch: input.webSearch,
        preferenceReasoningEffort: input.reasoningEffort,
        preferenceEnterKeySends: input.enterKeySends,
        preferenceShiftEnterKeySends: input.shiftEnterKeySends,
        preferenceSkipCloseThreadConfirmation:
          input.skipCloseThreadConfirmation,
        preferenceHideLegal: input.hideLegal,
      };

      if (
        filteredLastModels &&
        hiddenSet?.size &&
        filteredLastModels.length !== currentLastModels.length
      ) {
        Object.assign(updatePayload, { lastModels: filteredLastModels });
      }

      const [preferences] = await db
        .update(preferencesTable)
        .set(updatePayload)
        .where(eq(preferencesTable.userId, authUser.id))
        .returning();
      if (!preferences) {
        throw new Error("Failed to update preferences");
      }

      return {
        ok: true as const,
        preferences: {
          autoScroll: preferences.preferenceAutoScroll,
          hiddenProviders: preferences.preferenceHiddenProviders,
          webSearch: preferences.preferenceWebSearch,
          reasoningEffort:
            preferences.preferenceReasoningEffort as ReasoningEffort,
          enterKeySends: preferences.preferenceEnterKeySends,
          shiftEnterKeySends: preferences.preferenceShiftEnterKeySends,
          skipCloseThreadConfirmation:
            preferences.preferenceSkipCloseThreadConfirmation,
          hideLegal: preferences.preferenceHideLegal,
        },
      };
    }),

  syncUsers: adminProcedure.mutation(async () => {
    await syncUsers();
    return { ok: true };
  }),
});
