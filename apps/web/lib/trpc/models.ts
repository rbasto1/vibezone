import "server-only";

import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { locales, modelTranslations, models, providers } from "@/db/schema";
import {
  adminProcedure,
  publicProcedure,
  t,
} from "@/lib/trpc/server/initialize";
import { listModels, listModelsAdmin } from "./models-list";
import { syncFromOpenRouter } from "./models-sync";

export type GetModelsListReturn = Awaited<ReturnType<typeof listModels>>;

interface ModelDescriptionTranslation {
  localeId: string;
  localeName: string;
  description: string | null;
}

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

  adminDescriptions: adminProcedure
    .input(z.object({ modelId: z.string().min(1) }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          modelId: models.id,
          localeId: locales.id,
          modelDescription: models.description,
          localeName: locales.name,
          translatedDescription: modelTranslations.description,
        })
        .from(models)
        .innerJoin(locales, sql`true`)
        .leftJoin(
          modelTranslations,
          and(
            eq(modelTranslations.modelId, models.id),
            eq(modelTranslations.localeId, locales.id)
          )
        )
        .where(and(eq(models.id, input.modelId), isNull(models.deletedAt)))
        .orderBy(asc(locales.id));

      const row = rows[0];
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found",
        });
      }
      const { modelId, modelDescription } = row;

      return {
        id: modelId,
        description: modelDescription,
        translations: rows.map<ModelDescriptionTranslation>((row) => ({
          localeId: row.localeId,
          localeName: row.localeName,
          description: row.translatedDescription,
        })),
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
