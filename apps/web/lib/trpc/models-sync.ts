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
import type { OpenRouterModel } from "@/lib/open-router/schema";
import {
  MaritacaAIModelsResponse,
  OpenRouterModelsResponse,
} from "@/lib/open-router/schema";
import type { TextResult } from "deepl-node";
import {
  deepl,
  localeToSourceLanguageCode,
  localeToTargetLanguageCode,
} from "../deepl/deepl";
import { getModelOriginalLocale } from "../locale";

export async function syncFromOpenRouter() {
  const apiModelsRaw = await getApiData();
  const apiModels = apiModelsRaw.map(apiModelToDbModel);

  const apiProviderIds = Array.from(
    new Set(apiModels.map((m) => getProviderIdFromModelId(m.id)))
  );
  const apiParams = Array.from(
    new Set(apiModelsRaw.flatMap((m) => m.supported_parameters))
  );
  const apiModelIdSet = new Set(apiModels.map((m) => m.id));

  const {
    existingModelsList,
    existingProvidersList,
    existingSupportedParametersList,
    existingLocales,
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

  const insertModelsPromise = insertModels(newModels);

  await db
    .insert(modelSupportedParameters)
    .values(
      apiModelsRaw.flatMap((m) =>
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
    if (!existing) {
      return false;
    }
    if (m.description !== existing.description) {
      toUpdateDescription.push({
        id: m.id,
        description: existing.description,
      });
    }
    const { pricing, topProvider } = existing;
    return (
      m.name !== existing.name ||
      m.description !== existing.description ||
      m.pricing.prompt !== pricing.prompt ||
      m.pricing.completion !== pricing.completion ||
      m.pricing.image !== pricing.image ||
      m.pricing.request !== pricing.request ||
      m.pricing.web_search !== pricing.web_search ||
      m.pricing.internal_reasoning !== pricing.internal_reasoning ||
      m.pricing.input_cache_read !== pricing.input_cache_read ||
      m.pricing.input_cache_write !== pricing.input_cache_write ||
      m.topProvider.context_length !== topProvider.context_length ||
      m.topProvider.is_moderated !== topProvider.is_moderated ||
      m.topProvider.max_completion_tokens !== topProvider.max_completion_tokens
    );
  });

  const modelsUpdatedDescription = toUpdateDescription
    .concat(
      newModels.map((m) => ({
        id: m.id,
        description: m.description,
      }))
    )
    .concat(
      existingModelsList.filter(
        (m) => m.translations.length < existingLocales.length
      )
    )
    .filter(unique);

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
              name: m.name,
              description: m.description,
              pricing: m.pricing,
              topProvider: m.topProvider,
              apiCreatedAt: m.apiCreatedAt,
              // The insert will fail because it's a duplicate ID, we only care about the onConflictDoUpdate
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
            name: sql`EXCLUDED.name`,
            description: sql`EXCLUDED.description`,
            pricing: sql`EXCLUDED.pricing`,
            topProvider: sql`EXCLUDED.top_provider`,
            apiCreatedAt: sql`EXCLUDED.api_created_at`,
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
  const addedModels = newModels.map((m) => m.id);
  const updatedModels = toUpdate.map((m) => m.id);
  const translatedModels = Array.from(new Set(await translatedModelsPromise));

  console.info({
    addedProviders,
    addedModels,
    addedSupportedParameters,
    deletedModels,
    undeletedModels,
    updatedModels,
    translatedModels,
  });
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
  if (!models.length) return [];

  const locales = await db.query.locales.findMany({
    columns: { id: true },
  });
  let translatedModelIds: string[] = [];

  // Load manually edited translations to skip them
  const manuallyEdited = await db
    .select({
      modelId: modelTranslations.modelId,
      localeId: modelTranslations.localeId,
    })
    .from(modelTranslations)
    .where(sql`${modelTranslations.manuallyEditedAt} IS NOT NULL`);
  const manuallyEditedSet = new Set(
    manuallyEdited.map((m) => `${m.modelId}:${m.localeId}`)
  );

  const localeModels = models.reduce(
    (acc, model) => {
      const originalLocaleId = getModelOriginalLocale(model.id);
      acc[originalLocaleId] ??= [];
      acc[originalLocaleId].push(model);
      return acc;
    },
    {} as Record<string, Pick<NewModel, "id" | "description">[]>
  );

  for (const originalLocaleId of Object.keys(localeModels)) {
    const models = localeModels[originalLocaleId];
    if (!models) {
      throw new Error(
        "Assert: models has to be defined since we push the first when we add the key"
      );
    }

    for (const { id: targetLocaleId } of locales) {
      // Filter models that don't have manually edited translations for this locale
      const modelsToTranslate = models.filter(
        (model) => !manuallyEditedSet.has(`${model.id}:${targetLocaleId}`)
      );

      if (!modelsToTranslate.length) continue;

      const records = await translateFromLanguage(
        originalLocaleId,
        targetLocaleId,
        modelsToTranslate
      );

      while (records.length) {
        const batch = records.splice(0, 100);
        translatedModelIds = translatedModelIds.concat(
          batch.map((r) => r.modelId)
        );
        await db
          .insert(modelTranslations)
          .values(batch)
          .onConflictDoUpdate({
            target: [modelTranslations.modelId, modelTranslations.localeId],
            set: {
              description: sql.raw("EXCLUDED.description"),
            },
          });
      }
    }
  }

  return translatedModelIds;
}

async function translateFromLanguage(
  originalLocaleId: string,
  targetLocaleId: string,
  models: Pick<NewModel, "id" | "description">[]
) {
  let apiError = false;
  const records: NewModelTranslation[] = [];
  const sourceLanguageCode = localeToSourceLanguageCode(originalLocaleId);

  const texts: string[] = [];
  for (const model of models) {
    const { description } = model;
    const cleaned = cleanup(description);
    if (targetLocaleId === originalLocaleId) {
      records.push({
        modelId: model.id,
        localeId: targetLocaleId,
        description: cleaned,
      });
    } else {
      texts.push(cleaned);
    }
  }

  if (targetLocaleId === originalLocaleId) {
    return records;
  }

  let translation: TextResult[] = [];
  while (texts.length && !apiError) {
    const batch = texts.splice(0, 50);
    const targetLanguageCode = localeToTargetLanguageCode(targetLocaleId);
    const batchTranslations = await deepl
      .translateText(batch, sourceLanguageCode, targetLanguageCode)
      .catch((error) => {
        console.error("Error translating model descriptions:", error);
        apiError = true;
        return [];
      });

    translation = translation.concat(batchTranslations);
  }

  for (let i = 0; i < translation.length; i++) {
    const item = translation[i];
    const model = models[i];
    if (!item || !model?.description) continue;

    records.push({
      modelId: model.id,
      localeId: targetLocaleId,
      description: item.text,
    });
  }

  return records;
}

async function getApiData() {
  const openRouterDataPromise = getApiDataOpenRouter();
  const maritacaAIModelsPromise = getApiDataMaritacaAI();

  const [openRouterData, maritacaAIModels] = await Promise.all([
    openRouterDataPromise,
    maritacaAIModelsPromise,
  ]);

  const usdToBrl = 5.3;

  const getNameMaritacaAI = (modelId: string) => {
    switch (modelId) {
      case "sabia-3.1":
        return "Sabiá 3.1";
      case "sabia-3":
        return "Sabiá 3";
      case "sabiazinho-3":
        return "Sabiazinho 3";
      default:
        return "";
    }
  };

  const getDescriptionMaritacaAI = (modelId: string) => {
    const maritacaAICompanyDescription =
      "Maritaca AI é uma empresa brasileira que desenvolve inteligências artificiais especializadas em domínios e idiomas, garantindo que reflitam o conhecimento único de diversas regiões do planeta e segmentos de mercado.";
    switch (modelId) {
      case "sabia-3.1":
        return `Modelo mais avançado e atualizado da Maritaca AI, incorporando dados de até agosto de 2024. Oferece desempenho superior em raciocínio matemático, geração/refatoração de código e qualquer tarefa que exija conhecimento mais atualizado.\nExemplos de uso: Refatoração e otimização de código legado em múltiplas linguagens, síntese de relatórios de pesquisa clínica e assistente jurídico para revisão de contratos complexos.\n\n${maritacaAICompanyDescription}`;
      case "sabia-3":
        return `Modelo bom para a maioria das tarefas e ideal para tarefas complexas que exigem maior assertividade.\nExemplos de uso: Escrever artigos de pesquisa complexos, criar documentos técnicos detalhados, chatbots, gerar código.\n\n${maritacaAICompanyDescription}`;
      case "sabiazinho-3":
        return `Modelo mais econômico da Maritaca AI, projetado para tarefas mais simples. Ideal para aplicações que priorizam velocidade e custo.\nExemplos de uso: Tradução de textos, gerar descrições de produtos, resumos de artigos, criação de respostas para FAQs, ideias de conteúdo para blogs.\n\n${maritacaAICompanyDescription}`;
      default:
        return "";
    }
  };

  const getPromptPriceMaritacaAI = (modelId: string) => {
    switch (modelId) {
      case "sabia-3.1":
        return 5 / 1_000_000 / usdToBrl;
      case "sabia-3":
        return 5 / 1_000_000 / usdToBrl;
      case "sabiazinho-3":
        return 1 / 1_000_000 / usdToBrl;
      default:
        return -1;
    }
  };

  const getCompletionPriceMaritacaAI = (modelId: string) => {
    switch (modelId) {
      case "sabia-3.1":
        return 10 / 1_000_000 / usdToBrl;
      case "sabia-3":
        return 10 / 1_000_000 / usdToBrl;
      case "sabiazinho-3":
        return 3 / 1_000_000 / usdToBrl;
      default:
        return -1;
    }
  };

  const getSupportedParametersMaritacaAI = () => {
    return [
      "frequency_penalty",
      "max_tokens",
      "presence_penalty",
      "stop",
      "temperature",
      "tool_choice",
      "tools",
      "top_p",
    ];
  };

  return openRouterData.concat(
    maritacaAIModels.map((m): (typeof openRouterData)[0] => ({
      id: `maritacaai/${m.id}`,
      name: getNameMaritacaAI(m.id),
      canonical_slug: `maritacaai/${m.id}`,
      architecture: {
        modality: "text->text",
        input_modalities: ["text"],
        output_modalities: ["text"],
        tokenizer: "GPT",
        instruct_type: null,
      },
      created: m.created,
      description: getDescriptionMaritacaAI(m.id),
      pricing: {
        prompt: getPromptPriceMaritacaAI(m.id).toString(),
        completion: getCompletionPriceMaritacaAI(m.id).toString(),
      },
      supported_parameters: getSupportedParametersMaritacaAI(),
      top_provider: {
        context_length: m.id === "sabiazinho-3" ? 32000 : 128000,
        is_moderated: false,
        max_completion_tokens: null,
      },
    }))
  );
}

async function getApiDataMaritacaAI() {
  const apiKey = process.env.MARITACAAI_API_KEY;
  if (!apiKey) {
    throw new Error("MARITACAAI_API_KEY is not set");
  }

  // curl https://chat.maritaca.ai/api/models -H 'Authorization: Bearer 115734807544368241363_e437f29c65e01e82'
  const rest = await fetch("https://chat.maritaca.ai/api/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  }).catch((error) => {
    console.error("MaritacaAI: Fetch error", error);
    return null;
  });

  if (!rest) {
    return [];
  }

  if (!rest.ok) {
    const body = await rest.text().catch(() => "");
    console.error(`MaritacaAI: Status ${rest.status}: ${body}`);
    return [];
  }

  const json = await rest.json().catch((e) => {
    console.error(`MaritacaAI: Failed to parse models json: ${String(e)}`);
    return [];
  });
  const parsed = MaritacaAIModelsResponse.safeParse(json);
  if (!parsed.success) {
    console.error("MaritacaAI: Parse error", parsed.error);
    return [];
  }

  return parsed.data.data;
}

async function getApiDataOpenRouter() {
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
  const existingModelsListPromise = db.query.models.findMany({
    columns: {
      id: true,
      name: true,
      description: true,
      pricing: true,
      topProvider: true,
      deletedAt: true,
    },
    with: {
      translations: {
        columns: {
          localeId: true,
        },
      },
    },
  });
  const existingSupportedParametersListPromise = db
    .select({
      id: supportedParametersTable.id,
    })
    .from(supportedParametersTable);
  const existingLocalesPromise = db.query.locales.findMany({
    columns: {
      id: true,
    },
  });

  const [
    existingModelsList,
    existingProvidersList,
    existingSupportedParametersList,
    existingLocales,
  ] = await Promise.all([
    existingModelsListPromise,
    existingProvidersListPromise,
    existingSupportedParametersListPromise,
    existingLocalesPromise,
  ]);

  return {
    existingModelsList,
    existingProvidersList,
    existingSupportedParametersList,
    existingLocales,
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

function apiModelToDbModel(m: OpenRouterModel) {
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
    apiCreatedAt: new Date(m.created * 1000),
    isChat,
    isFree,
  } satisfies NewModel;
}

function unique(
  value: { id: string },
  index: number,
  self: Array<{ id: string }>
) {
  return self.findIndex((v) => v.id === value.id) === index;
}

function cleanup(description: string): string {
  return description
    .replace(/\s?\[Learn more in our docs\]\(https:\/\/\S+\)/g, "")
    .replace(/([^\]])\(https:\/\/openrouter.ai\/\S+\)/g, (_, p) =>
      p === " " ? "" : p
    )
    .replace(/\[([^\]]+)\]\(\/[^)]+\)/g, (_, p) => p);
}
