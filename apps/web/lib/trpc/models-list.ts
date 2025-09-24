import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { models, providers } from "@/db/schema";

export async function listModels(showDeleted = false) {
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
      showDeleted ? undefined : isNull(models.deletedAt),
      showDeleted ? undefined : isNull(providers.deletedAt),
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
