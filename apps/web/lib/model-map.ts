import { models } from "@/generated/models";

export const modelMap = new Map(
  models.models.map((model) => [model.id, model] as const)
);

export const providerMap = new Map(
  models.providers.map((provider) => [provider.id, provider] as const)
);
