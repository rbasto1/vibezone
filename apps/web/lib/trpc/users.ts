import "server-only";

import type { User as DbUser } from "@/db";
import { db } from "@/db";
import { reasoningEffort } from "@/db/enums";
import { chats, models, session, usage, user } from "@/db/schema";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  max,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { MAX_PANELS } from "../constants";
import { adminProcedure, authenticatedProcedure, t } from "./server/initialize";

export const usersRouter = t.router({
  manageList: adminProcedure.query(async () => {
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

    const usersRows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        continents: costQuery.continents,
        countries: costQuery.countries,
        sessionsLast7: count(sql`distinct ${session.id}`),
        lastLoginAt: max(session.createdAt),
        chatsCount: count(sql`distinct ${chats.id}`),
        completionsCount: count(sql`distinct ${usage.id}`),
        activeDaysCount: sql<number>`count(distinct date_trunc('day', ${usage.createdAt}))::int`,
        costLast30: costQuery.totalCost30,
        costLast7: costQuery.totalCost7,
      })
      .from(user)
      .leftJoin(
        session,
        and(eq(session.userId, user.id), gte(session.createdAt, lastSevenDays))
      )
      .leftJoin(
        chats,
        and(eq(chats.userId, user.id), gte(chats.lastMessageAt, lastSevenDays))
      )
      .leftJoin(
        usage,
        and(eq(usage.userId, user.id), gte(usage.createdAt, lastSevenDays))
      )
      .leftJoinLateral(costQuery, eq(costQuery.userId, user.id))
      .groupBy(
        user.id,
        costQuery.userId,
        costQuery.totalCost30,
        costQuery.totalCost7,
        costQuery.continents,
        costQuery.countries
      )
      .orderBy(desc(user.createdAt))
      .catch((error) => {
        console.error(error);
        throw error;
      });

    return usersRows;
  }),

  // Replace lastModels with the exact array in the given order,
  // filtering out invalid/deleted/non-chat models
  setLastModels: authenticatedProcedure
    .input(z.object({ modelIds: z.array(z.string()).max(MAX_PANELS) }))
    .mutation(async ({ ctx, input }) => {
      const authUser = ctx.user!;

      if (!input.modelIds.length) {
        await db
          .update(user)
          .set({ lastModels: [] })
          .where(eq(user.id, authUser.id));
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
        .update(user)
        .set({ lastModels: ordered })
        .where(eq(user.id, authUser.id));

      return { ok: true as const, lastModels: ordered };
    }),

  updatePreferences: authenticatedProcedure
    .input(
      z.object({
        autoScroll: z.boolean().optional(),
        hiddenProviders: z.array(z.string()).optional(),
        systemPrompt: z.string().max(4000).nullable().optional(),
        webSearch: z.boolean().optional(),
        reasoningEffort: z.enum(reasoningEffort.enumValues).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const authUser = ctx.user;

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
            .select({ lastModels: user.lastModels })
            .from(user)
            .where(eq(user.id, authUser.id))
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

      const updatePayload: Partial<DbUser> = {
        preferenceAutoScroll: input.autoScroll,
        preferenceHiddenProviders: sanitizedHiddenProviders,
        preferenceSystemPrompt: input.systemPrompt,
        preferenceSystemPromptChangedAt: input.systemPrompt
          ? new Date()
          : undefined,
        preferenceWebSearch: input.webSearch,
        preferenceReasoningEffort: input.reasoningEffort,
      };

      if (
        filteredLastModels &&
        hiddenSet?.size &&
        filteredLastModels.length !== currentLastModels.length
      ) {
        Object.assign(updatePayload, { lastModels: filteredLastModels });
      }

      await db.update(user).set(updatePayload).where(eq(user.id, authUser.id));

      return {
        ok: true as const,
        preferences: {
          autoScroll: input.autoScroll,
          hiddenProviders: sanitizedHiddenProviders,
          systemPrompt: input.systemPrompt,
          webSearch: input.webSearch,
          reasoningEffort: input.reasoningEffort,
          lastModels:
            "lastModels" in updatePayload
              ? filteredLastModels
              : currentLastModels,
        },
      };
    }),
});
