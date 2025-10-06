import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import type { Provider } from "@/db/schema";
import {
  models as modelsTable,
  providers as providersTable,
  suggestionGroups,
  suggestionGroupTranslations,
} from "@/db/schema";

export async function listModels() {
  const result = await db.query.models.findMany({
    columns: {
      pricing: false,
      topProvider: false,
      perRequestLimits: false,
      architectureModality: false,
      architectureTokenizer: false,
      architectureInstructType: false,
    },
    where: and(
      isNull(modelsTable.deletedAt),
      isNull(modelsTable.hiddenAt),
      isNull(providersTable.deletedAt),
      eq(modelsTable.isChat, true)
    ),
    with: {
      provider: true,
      supportedParameters: true,
    },
    orderBy: [modelsTable.id],
  });
  const groups = await db.query.suggestionGroups.findMany({
    columns: {
      id: true,
      icon: true,
      promoted: true,
      models: true,
    },
    with: {
      translations: {
        columns: {
          localeId: true,
          title: true,
          label: true,
        },
        orderBy: [suggestionGroupTranslations.localeId],
      },
    },
    orderBy: [suggestionGroups.id],
  });

  const uniqueProviders = getUniqueProviders(result);

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
        isFree: model.isFree,
        createdAt: model.createdAt,
        deletedAt: model.deletedAt,
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
      };
    }),
    providers: uniqueProviders.map((provider) => ({
      id: provider.id,
      name: provider.name,
      tier: provider.tier,
      order: provider.order,
      dataRetention: provider.dataRetention || !provider.privacyPolicyUrl,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      deletedAt: provider.deletedAt,
    })),
    groups,
  };
}

export async function listModelsAdmin() {
  const rows = await db.query.models.findMany({
    columns: {
      topProvider: false,
      perRequestLimits: false,
      architectureModality: false,
      architectureTokenizer: false,
      architectureInstructType: false,
    },
    where: and(isNull(modelsTable.deletedAt), isNull(providersTable.deletedAt)),
    with: {
      provider: true,
    },
    orderBy: [modelsTable.id],
  });

  const providers = getUniqueProviders(rows);

  return {
    models: rows.map((row) => {
      const { provider, ...model } = row;
      return {
        ...model,
        pricing: {
          prompt: Number(model.pricing.prompt),
          completion: Number(model.pricing.completion),
          request: numberOrNull(model.pricing.request),
          image: numberOrNull(model.pricing.image),
          webSearch: numberOrNull(model.pricing.web_search),
          internalReasoning: numberOrNull(model.pricing.internal_reasoning),
        },
      };
    }),
    providers,
  };
}

function numberOrNull(value: string | null | undefined) {
  return value ? Number(value) : null;
}

function getUniqueProviders(result: { provider: Provider }[]) {
  return result
    .map((item) => item.provider)
    .reduce(
      (acc, provider) => {
        if (!acc.some((p) => p.id === provider.id)) {
          acc.push(provider);
        }
        return acc;
      },
      [] as (typeof result)[0]["provider"][]
    )
    .sort((a, b) => {
      // Sort by order first, then by name as fallback
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
}
