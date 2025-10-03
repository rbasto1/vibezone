import "server-only";

import { and, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import type {
  NewModel,
  NewModelTranslation,
  NewProvider,
  NewSupportedParameter,
} from "@/db/schema";
import {
  models as modelsTable,
  modelSupportedParameters,
  modelTranslations,
  providers as providersTable,
  supportedParameters as supportedParametersTable,
} from "@/db/schema";
import { OpenRouterModelsResponse } from "@/lib/open-router/schema";
import { deepl, localeToTargetLanguageCode } from "../deepl/deepl";

export async function syncFromOpenRouter() {
  const apiModels = await getApiData();

  const apiProviderIds = Array.from(
    new Set(apiModels.map((m) => getProviderIdFromModelId(m.id)))
  );
  const apiParams = Array.from(
    new Set(apiModels.flatMap((m) => m.supported_parameters))
  );
  const apiModelIdSet = new Set(apiModels.map((m) => m.id));

  const {
    existingModelsList,
    existingProvidersList,
    existingSupportedParametersList,
  } = await getExistingData();

  const existingModelsSet: Set<string> = new Set(
    existingModelsList.map((m) => m.id)
  );
  const existingProvidersSet: Set<string> = new Set(
    existingProvidersList.map((m) => m.id)
  );
  const existingSupportedParametersSet: Set<string> = new Set(
    existingSupportedParametersList.map((m) => m.id)
  );

  const newProviders = apiProviderIds.filter(
    (pid) => !existingProvidersSet.has(pid)
  );
  const newModels = apiModels.filter((m) => !existingModelsSet.has(m.id));
  const newSupportedParameters = apiParams.filter(
    (p) => !existingSupportedParametersSet.has(p)
  );

  const insertProvidersPromise = insertProviders(
    Array.from(newProviders).map((p) => ({ id: p, name: p }))
  );

  const insertSupportedParametersPromise = insertSupportedParameters(
    Array.from(newSupportedParameters).map((p) => ({ id: p, label: p }))
  );

  console.info(
    `New models: ${newModels.length}`,
    newModels.map((m) => m.id)
  );

  const values = newModels.map((m) => {
    const providerId = getProviderIdFromModelId(m.id);
    const isFree = m.name.endsWith(" (free)");

    // Remove the " (free)" suffix from the name if present
    const name = (m.name.split(": ")[1] ?? m.name).replace(/\s*\(free\)$/, "");

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
      isFree,
    } satisfies NewModel;
  });
  const insertModelsPromise = insertModels(values);

  await db
    .insert(modelSupportedParameters)
    .values(
      apiModels.flatMap((m) =>
        m.supported_parameters.map((p) => ({
          modelId: m.id,
          supportedParameterId: p,
        }))
      )
    )
    .onConflictDoNothing();

  // Soft-delete models not present anymore
  const deletedModels = existingModelsList
    .filter((m) => !apiModelIdSet.has(m.id) && !m.deletedAt)
    .map((m) => m.id);
  const softDeletePromise = deletedModels.length
    ? db
        .update(modelsTable)
        .set({ deletedAt: sql`current_timestamp` })
        .where(
          and(
            inArray(modelsTable.id, deletedModels),
            isNull(modelsTable.deletedAt)
          )
        )
        .then(() => deletedModels.length)
    : 0;

  // Undelete but hide models that are deleted but appeared in the list
  const undeletedModels = existingModelsList
    .filter((m) => apiModelIdSet.has(m.id) && !!m.deletedAt)
    .map((m) => m.id);
  const undeleteModelsPromise = undeletedModels.length
    ? db
        .update(modelsTable)
        .set({ deletedAt: null, hiddenAt: sql`current_timestamp` })
        .where(
          and(
            inArray(modelsTable.id, undeletedModels),
            isNull(modelsTable.hiddenAt)
          )
        )
        .then(() => undeletedModels.length)
    : 0;

  const toUpdateDescription: Pick<NewModel, "id" | "description">[] = [];
  const toUpdate = apiModels.filter((m) => {
    const existing = existingModelsList.find((d) => d.id === m.id);
    if (!existing) return false;
    if (m.description !== existing.description) {
      toUpdateDescription.push({
        id: m.id,
        description: existing.description,
      });
    }
    const { pricing, topProvider } = existing;
    return (
      m.description !== existing.description ||
      m.pricing.prompt !== pricing.prompt ||
      m.pricing.completion !== pricing.completion ||
      m.pricing.image !== pricing.image ||
      m.pricing.request !== pricing.request ||
      m.pricing.web_search !== pricing.web_search ||
      m.pricing.internal_reasoning !== pricing.internal_reasoning ||
      m.pricing.input_cache_read !== pricing.input_cache_read ||
      m.pricing.input_cache_write !== pricing.input_cache_write ||
      m.top_provider.context_length !== topProvider.context_length ||
      m.top_provider.is_moderated !== topProvider.is_moderated ||
      m.top_provider.max_completion_tokens !== topProvider.max_completion_tokens
    );
  });

  const modelsUpdatedDescription = toUpdateDescription.concat(
    values.map((m) => ({
      id: m.id,
      description: m.description,
    }))
  );

  const translatedModelsPromise = translateModelDescriptions(
    modelsUpdatedDescription
  );

  const updateModelsPromise = toUpdate.length
    ? db
        .insert(modelsTable)
        .values(
          toUpdate.map(
            (m): NewModel => ({
              id: m.id,
              description: m.description,
              pricing: m.pricing,
              topProvider: m.top_provider,
              // The insert will fail because it's a duplicate ID, we only care about the onConflictDoUpdate
              name: "",
              providerId: "",
              canonicalSlug: "",
              huggingFaceId: "",
              architectureOutputModalities: [],
              architectureTokenizer: "",
              architectureInstructType: "",
              architectureModality: "",
              architectureInputModalities: [],
              isChat: true,
            })
          )
        )
        .onConflictDoUpdate({
          target: modelsTable.id,
          set: {
            description: sql`EXCLUDED.description`,
            pricing: sql`EXCLUDED.pricing`,
            topProvider: sql`EXCLUDED.top_provider`,
          },
        })
        .then(() => toUpdate.length)
    : 0;

  await Promise.all([
    insertProvidersPromise,
    insertModelsPromise,
    insertSupportedParametersPromise,
    softDeletePromise,
    undeleteModelsPromise,
    updateModelsPromise,
    translatedModelsPromise,
  ]);

  const addedProviders = Array.from(newProviders);
  const addedSupportedParameters = Array.from(newSupportedParameters);
  const addedModels = values.map((m) => m.id);
  const updatedModels = toUpdate.map((m) => m.id);
  const translatedModels = Array.from(
    new Set(modelsUpdatedDescription.map((m) => m.id))
  );

  return {
    addedProviders,
    addedModels,
    addedSupportedParameters,
    deletedModels,
    undeletedModels,
    updatedModels,
    translatedModels,
  };
}

async function translateModelDescriptions(
  models: Pick<NewModel, "id" | "description">[]
) {
  if (!models.length) return;

  const locales = await db.query.locales.findMany();

  const records: NewModelTranslation[] = [];

  for (const { id: localeId } of locales) {
    const texts: string[] = [];
    for (const model of models) {
      const { description } = model;

      if (localeId === "en") {
        records.push({
          modelId: model.id,
          localeId,
          description,
        });
      } else {
        texts.push(description ?? "");
      }
    }

    if (localeId === "en") {
      continue;
    }

    const targetLanguageCode = localeToTargetLanguageCode(localeId);
    const translation = await deepl.translateText(
      texts,
      "en",
      targetLanguageCode
    );

    for (let i = 0; i < translation.length; i++) {
      const item = translation[i];
      const model = models[i];
      if (!item || !model?.description) continue;

      records.push({
        modelId: model.id,
        localeId,
        description: item.text,
      });
    }
  }

  if (records.length) {
    await db
      .insert(modelTranslations)
      .values(records)
      .onConflictDoUpdate({
        target: [modelTranslations.modelId, modelTranslations.localeId],
        set: {
          description: sql`EXCLUDED.description`,
        },
      });
  }
  return records.length;
}

async function getApiData() {
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
    console.error(parsed.error);
    throw new Error(parsed.error.issues[0]?.message ?? "Parse error");
  }

  return parsed.data.data;
}

async function getExistingData() {
  const existingProvidersListPromise = db
    .select({
      id: providersTable.id,
    })
    .from(providersTable);
  const existingModelsListPromise = db
    .select({
      id: modelsTable.id,
      description: modelsTable.description,
      pricing: modelsTable.pricing,
      topProvider: modelsTable.topProvider,
      deletedAt: modelsTable.deletedAt,
    })
    .from(modelsTable);
  const existingSupportedParametersListPromise = db
    .select({
      id: supportedParametersTable.id,
    })
    .from(supportedParametersTable);

  const [
    existingModelsList,
    existingProvidersList,
    existingSupportedParametersList,
  ] = await Promise.all([
    existingModelsListPromise,
    existingProvidersListPromise,
    existingSupportedParametersListPromise,
  ]);

  return {
    existingModelsList,
    existingProvidersList,
    existingSupportedParametersList,
  };
}

async function insertProviders(providers: NewProvider[]) {
  if (!providers.length) return 0;

  const result = await db.insert(providersTable).values(providers);

  return result.rowCount;
}

async function insertSupportedParameters(
  supportedParameters: NewSupportedParameter[]
) {
  if (!supportedParameters.length) return 0;

  const result = await db
    .insert(supportedParametersTable)
    .values(supportedParameters);

  return result.rowCount;
}

async function insertModels(models: NewModel[]) {
  if (!models.length) return 0;

  const result = await db.insert(modelsTable).values(models);

  return result.rowCount;
}

function getProviderIdFromModelId(modelId: string): string {
  const id = modelId.split("/")[0];
  if (!id) throw new Error("Assert: Missing provider ID");
  return id;
}
