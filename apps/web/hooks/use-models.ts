import { useMemo } from "react";

import type { GetModelsListReturn } from "@/lib/trpc/models";
import { modelsAtom } from "@/store/models";
import { useAtomValue } from "jotai";

import { useSession } from "./use-session";

interface UseModelsOptions {
  includeProviders?: string[];
  includeModels?: string[];
}

export function useRawModelsValue(): GetModelsListReturn {
  return useAtomValue(modelsAtom);
}

export function useModelsValue(options?: UseModelsOptions): GetModelsListReturn {
  const raw = useAtomValue(modelsAtom);
  const session = useSession();
  const includeProvidersOption = options?.includeProviders;
  const includeModelsOption = options?.includeModels;

  return useMemo(() => {
    const hiddenProviders = session?.user?.preferenceHiddenProviders ?? [];
    const includeProviders = includeProvidersOption ?? [];
    const includeModels = includeModelsOption ?? [];

    if (!hiddenProviders.length) {
      return raw;
    }

    const includeProviderSet = new Set(includeProviders);
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

    const allowedProviderIds = new Set(providers.map((provider) => provider.id));

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
  }, [
    raw,
    session?.user?.preferenceHiddenProviders,
    includeProvidersOption,
    includeModelsOption,
  ]);
}
