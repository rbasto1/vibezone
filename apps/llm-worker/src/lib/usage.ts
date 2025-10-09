import type { ProviderMetadata } from "ai";
import { z } from "zod";
import type { VibezoneContext } from "../worker";
import { schema } from "./db";

interface PersistUsageParams {
  vzContext: VibezoneContext;
  providerMetadata: Promise<ProviderMetadata | undefined>;
  isAborted: boolean;
}

const OpenRouterMetadataSchema = z.object({
  openrouter: z.object({
    usage: z.object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    }),
    provider: z.string(),
  }),
});

export const persistUsage = async (params: PersistUsageParams) => {
  const { isAborted, vzContext, providerMetadata } = params;
  const modelId = vzContext.completionRequest.config.modelId;
  const { db, usageContext, requestHeaders } = vzContext;
  if (!usageContext) {
    throw new Error("Usage context not found");
  }

  const metadata = await providerMetadata;

  const openrouterMetadata = OpenRouterMetadataSchema.safeParse(metadata).data;
  const openrouterUsage = openrouterMetadata?.openrouter.usage;

  const ip =
    requestHeaders.get("CF-Connecting-IP") ??
    requestHeaders.get("X-Forwarded-For") ??
    null;

  await db
    .insert(schema.usage)
    .values({
      userId: usageContext.userId,
      userKey: usageContext.userKey,
      ip,
      userAgent: requestHeaders.get("User-Agent"),
      cfRay: requestHeaders.get("CF-Ray"),
      geo: extractGeo(vzContext.cf),
      modelId,
      providerMetadata: metadata,
      tokensPrompt: openrouterUsage?.promptTokens,
      tokensCompletion: openrouterUsage?.completionTokens,
      responseStatus: isAborted ? "aborted" : "finished",
    })
    .catch((error) => {
      console.error({
        message: "Failed to persist usage log",
        error,
        metadata,
        usageContext,
        openrouterUsage,
        ip,
        modelId,
      });
    });
};

function extractGeo(cf: VibezoneContext["cf"]): Record<string, unknown> | null {
  if (!cf) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(cf));
  } catch (error) {
    console.warn({ message: "Failed to serialize geo data", error, cf });
    return null;
  }
}
