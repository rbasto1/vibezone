import { eq } from "drizzle-orm";

import { db } from "./connection";
import { type Model, models, type Provider, providers } from "./schema";

export async function getAllProviders(): Promise<Provider[]> {
  return await db.select().from(providers).orderBy(providers.name);
}

export async function getProviderById(
  id: string
): Promise<Provider | undefined> {
  const result = await db.select().from(providers).where(eq(providers.id, id));
  return result[0];
}

export async function getAllModels(): Promise<Model[]> {
  return await db.select().from(models).orderBy(models.name);
}

export async function getModelsByProvider(
  providerId: string
): Promise<Model[]> {
  return await db
    .select()
    .from(models)
    .where(eq(models.providerId, providerId))
    .orderBy(models.name);
}

export async function getIncludedModels(): Promise<Model[]> {
  return await db
    .select()
    .from(models)
    .where(eq(models.isIncluded, true))
    .orderBy(models.name);
}

export async function getPremiumModels(): Promise<Model[]> {
  return await db
    .select()
    .from(models)
    .where(eq(models.isPremium, true))
    .orderBy(models.name);
}

export async function getModelsWithCapability(
  capability: keyof Pick<
    Model,
    | "capabilityFast"
    | "capabilityVision"
    | "capabilityPdf"
    | "capabilityReasoning"
    | "capabilityImageGeneration"
    | "capabilityTools"
    | "capabilityEffortControl"
  >
): Promise<Model[]> {
  return await db
    .select()
    .from(models)
    .where(eq(models[capability], true))
    .orderBy(models.name);
}

export async function getModelsWithProviders() {
  return await db
    .select({
      model: models,
      provider: providers,
    })
    .from(models)
    .leftJoin(providers, eq(models.providerId, providers.id))
    .orderBy(models.name);
}

export async function getModelById(id: string): Promise<Model | undefined> {
  const result = await db.select().from(models).where(eq(models.id, id));
  return result[0];
}
