import { useMemo } from "react";

import { models as raw } from "@/generated/models";
import type { GetModelsListReturn } from "@/lib/trpc/models";
import { useUserPreferencesValue } from "./use-user-preferences";

interface UseModelsOptions {
  includeModels?: string[];
}

export function useModelsValue(
  options?: UseModelsOptions
): GetModelsListReturn {
  const preferences = useUserPreferencesValue();
  const includeModelsOption = options?.includeModels;

  return useMemo(() => {
    const hiddenProviders = preferences?.hiddenProviders ?? [];
    const includeModels = includeModelsOption ?? [];

    if (!hiddenProviders.length) {
      return raw;
    }

    const includeProviderSet = new Set();
    const includeModelSet = new Set(includeModels);

    for (const modelId of includeModels) {
      const providerId = modelId.split("/")[0];
      if (providerId) {
        includeProviderSet.add(providerId);
      }
    }

    const hiddenSet = new Set(hiddenProviders);

    const providers = raw.providers.filter((provider) => {
      if (includeProviderSet.has(provider.id)) {
        return true;
      }
      return !hiddenSet.has(provider.id);
    });

    const allowedProviderIds = new Set(
      providers.map((provider) => provider.id)
    );

    const models = raw.models.filter((model) => {
      if (allowedProviderIds.has(model.providerId)) {
        return true;
      }
      if (includeModelSet.has(model.id)) {
        return true;
      }
      return false;
    });

    const groups = raw.groups
      .map((group) => ({
        ...group,
        models: group.models.filter((modelId) => {
          if (includeModelSet.has(modelId)) {
            return true;
          }
          const providerId = modelId.split("/")[0];
          return providerId ? allowedProviderIds.has(providerId) : false;
        }),
      }))
      .filter((group) => group.models.length > 0);

    return {
      providers,
      models,
      groups,
    } satisfies GetModelsListReturn;
  }, [preferences?.hiddenProviders, includeModelsOption]);
}
