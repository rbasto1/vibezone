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
import {
  adminProcedure,
  publicProcedure,
  t,
} from "@/lib/trpc/server/initialize";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

// Shared server function to list models for SSR and tRPC
export type GetModelsListReturn = Awaited<ReturnType<typeof listModels>>;

export const modelsRouter = t.router({
  list: publicProcedure.query(listModels),

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

  delete: adminProcedure
    .input(z.object({ id: z.string().nonempty() }))
    .mutation(async ({ input }) => {
      await db
        .update(models)
        .set({
          deletedAt: sql`current_timestamp`,
          updatedAt: sql`current_timestamp`,
        })
        .where(eq(models.id, input.id));
      return { ok: true } as const;
    }),

  syncFromOpenRouter: adminProcedure.mutation(async () => {
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
      (await db.select({ id: models.id }).from(models)).map((m) => m.id)
    );
    const newModels = modelsData.filter((m) => !existingModels.has(m.id));
    console.info(
      `New models: ${newModels.length}`,
      newModels.map((m) => m.id)
    );

    // Upsert new models
    if (newModels.length) {
      const values = newModels.map((m) => {
        const providerId = m.id.split("/")[0];
        const name = m.name.split(": ")[1] ?? m.name;

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
      });
      await db.insert(models).values(values);

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

export async function listModels() {
  const result = await db.query.models.findMany({
    where: and(
      isNull(models.deletedAt),
      isNull(providers.deletedAt),
      eq(models.isChat, true)
    ),
    with: {
      provider: true,
      supportedParameters: true,
    },
    orderBy: [
      asc(models.providerId),
      desc(models.createdAt),
      desc(models.name),
    ],
  });
  const groups = await db.query.suggestionGroups.findMany();

  const uniqueProviders = result
    .map((item) => item.provider)
    .reduce((acc, provider) => {
      if (!acc.some((p) => p.id === provider.id)) {
        acc.push(provider);
      }
      return acc;
    }, [] as Provider[])
    .sort((a, b) => {
      // Sort by order first, then by name as fallback
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

  return {
    models: result.map((model) => {
      const modelParams = model.supportedParameters.map(
        (p) => p.supportedParameterId
      );
      return {
        id: model.id,
        name: model.name,
        providerId: model.providerId,
        priority: model.priority,
        isSuggested: model.isSuggested,
        isExperimental: model.isExperimental,
        isPremium: model.isPremium,
        isNew: model.isNew,
        isIncluded: model.isIncluded,
        createdAt: model.createdAt,
        // Capabilities (short names used in UI)
        capReason: modelParams.includes("reasoning"),
        capTools: modelParams.includes("tools"),
        capVision:
          model.architectureInputModalities?.includes("image") ?? false,
        capPdf: model.architectureInputModalities?.includes("file") ?? false,
        capImageGen:
          model.architectureOutputModalities?.includes("image") ?? false,
        // capabilityEffortControl: model.capabilityEffortControl,
        provider: {
          name: model.provider.name,
        },
        groups: new Set(
          groups.filter((g) => g.models.includes(model.id)).map((g) => g.id)
        ),
      };
    }),
    providers: uniqueProviders,
    groups: groups.map((g) => ({
      id: g.id,
      title: g.title,
      label: g.label,
      icon: g.icon,
      promoted: g.promoted,
      models: g.models.slice(0, 3),
    })),
  };
}
