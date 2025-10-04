import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { models, providers } from "@/db/schema";
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

  details: publicProcedure
    .input(
      z.object({
        modelId: z.string().min(1),
        localeId: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const model = await db.query.models.findFirst({
        columns: {
          id: true,
          description: true,
          topProvider: true,
          createdAt: true,
        },
        where: and(
          eq(models.id, input.modelId),
          isNull(models.deletedAt),
          isNull(models.hiddenAt),
          isNull(providers.deletedAt)
        ),
        with: {
          provider: {
            columns: {
              privacyPolicyUrl: true,
            },
          },
          translations: {
            columns: {
              localeId: true,
              description: true,
            },
          },
        },
      });

      if (!model) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found",
        });
      }

      const translation =
        model.translations.find((t) => t.localeId === input.localeId) ??
        model.translations.find((t) => t.localeId === "en");

      return {
        id: model.id,
        description: translation?.description ?? model.description,
        contextLength: model.topProvider?.context_length ?? null,
        maxCompletionTokens: model.topProvider?.max_completion_tokens ?? null,
        privacyPolicyUrl: model.provider.privacyPolicyUrl,
        createdAt: model.createdAt,
      };
    }),

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
