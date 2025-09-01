import "server-only";

import { db } from "@/db";
import type {
  NewModel,
  NewProvider,
  NewSupportedParameter,
  Provider,
} from "@/db/schema";
import {
  models,
  modelSupportedParameters,
  providers,
  supportedParameters,
} from "@/db/schema";
import { OpenRouterModelsResponse } from "@/lib/open-router/schema";
import { publicProcedure, t } from "@/lib/trpc/server/initialize";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

// Shared server function to list models for SSR and tRPC
export type GetModelsListReturn = Awaited<ReturnType<typeof getModelsList>>;
export async function getModelsList() {
  const result = await db
    .select({
      model: models,
      provider: providers,
    })
    .from(models)
    .innerJoin(providers, eq(models.providerId, providers.id))
    .where(and(isNull(models.deletedAt), eq(models.isChat, true)))
    .orderBy(models.name);

  const uniqueProviders = result
    .map((item) => item.provider)
    .reduce((acc, provider) => {
      if (!acc.some((p) => p.id === provider.id)) {
        acc.push(provider);
      }
      return acc;
    }, [] as Provider[])
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    models: result.map((item) => ({
      ...item.model,
      provider: {
        name: item.provider.name,
      },
    })),
    providers: uniqueProviders,
  };
}

export const modelsRouter = t.router({
  list: publicProcedure.query(getModelsList),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().nonempty(),
        priority: z.number().int().nullable().optional(),
        isFlagship: z.boolean().optional(),
        isCoder: z.boolean().optional(),
        isArtist: z.boolean().optional(),
        isSuggested: z.boolean().optional(),
        capabilityFast: z.boolean().optional(),
        capabilityVision: z.boolean().optional(),
        capabilityPdf: z.boolean().optional(),
        capabilityReasoning: z.boolean().optional(),
        capabilityImageGeneration: z.boolean().optional(),
        capabilityTools: z.boolean().optional(),
        capabilityEffortControl: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await db
        .update(models)
        .set({
          ...rest,
          updatedAt: sql`current_timestamp`,
        })
        .where(eq(models.id, id));
      return { ok: true } as const;
    }),

  syncFromOpenRouter: publicProcedure.mutation(async () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set");
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    }).catch((e) => {
      throw new Error(`Failed to fetch models: ${String(e)}`);
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenRouter models error ${res.status}: ${body}`);
    }
    const json = await res.json().catch((e) => {
      throw new Error(`Failed to parse models json: ${String(e)}`);
    });
    const parsed = OpenRouterModelsResponse.safeParse(json);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Parse error");
    }

    const modelsData = parsed.data.data;

    // Ensure providers exist
    const providerIds = Array.from(
      new Set(modelsData.map((m) => m.id.split("/")[0]))
    );
    // Upsert supported parameters reference rows
    const allParams = Array.from(
      new Set(modelsData.flatMap((m) => m.supported_parameters))
    );

    if (providerIds.length) {
      await db
        .insert(providers)
        .values(
          providerIds.map((pid): NewProvider => {
            if (!pid) throw new Error("Assert: Missing provider ID");
            return { id: pid, name: pid };
          })
        )
        .onConflictDoNothing();

      await db
        .insert(supportedParameters)
        .values(
          allParams.map((p): NewSupportedParameter => ({ id: p, label: p }))
        )
        .onConflictDoNothing();
    }

    const existingModels: Set<string> = new Set(
      (
        await db.query.models.findMany({
          columns: { id: true },
        })
      ).map((m) => m.id)
    );
    const newModels = modelsData.filter((m) => !existingModels.has(m.id));

    // Upsert new models
    if (newModels.length) {
      await db.insert(models).values(
        newModels.map((m) => {
          const providerId = m.id.split("/")[0];
          const name = m.name.split(": ")[1];
          if (!name) {
            throw new Error(
              "Assert: Model name does not conform to pattern 'Provider: Name'"
            );
          }
          if (!providerId) throw new Error("Assert: Missing provider ID");
          const isChat =
            !!m.architecture.input_modalities?.includes("text") &&
            !!m.architecture.output_modalities?.includes("text");
          return {
            id: m.id,
            providerId,
            name,
            canonicalSlug: m.canonical_slug,
            huggingFaceId: m.hugging_face_id,
            description: m.description,
            architectureModality: m.architecture.modality,
            architectureInputModalities: m.architecture.input_modalities,
            architectureOutputModalities: m.architecture.output_modalities,
            architectureTokenizer: m.architecture.tokenizer,
            architectureInstructType: m.architecture.instruct_type,
            pricing: m.pricing,
            topProvider: m.top_provider,
            perRequestLimits: m.per_request_limits,
            createdAt: new Date(m.created * 1000),
            isChat,
          } satisfies NewModel;
        })
      );

      // Insert supported parameters
      await db
        .insert(supportedParameters)
        .values(
          allParams.map((p): NewSupportedParameter => ({ id: p, label: p }))
        )
        .onConflictDoNothing();

      // Insert supported parameters relations
      await db
        .insert(modelSupportedParameters)
        .values(
          modelsData.flatMap((m) =>
            m.supported_parameters.map((p) => ({
              modelId: m.id,
              supportedParameterId: p,
            }))
          )
        )
        .onConflictDoNothing();
    }

    // Soft-delete models not present anymore
    const incomingIds = new Set(modelsData.map((m) => m.id));
    const toSoftDelete = Array.from(existingModels).filter(
      (id) => !incomingIds.has(id)
    );
    if (toSoftDelete.length) {
      await db
        .update(models)
        .set({
          deletedAt: sql`current_timestamp`,
          updatedAt: sql`current_timestamp`,
        })
        .where(inArray(models.id, toSoftDelete));
    }

    return {
      providersUpserted: providerIds.length,
      modelsUpserted: modelsData.length,
      softDeleted: toSoftDelete.length,
      parametersSeen: allParams.length,
    };
  }),
});
