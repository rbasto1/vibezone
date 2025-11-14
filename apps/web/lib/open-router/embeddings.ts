import "server-only";

import { z } from "zod";

const EmbeddingVectorSchema = z.object({
  index: z.number(),
  embedding: z.array(z.number()),
});

const OpenRouterEmbeddingsResponseSchema = z.object({
  data: z.array(EmbeddingVectorSchema),
});

type OpenRouterEmbeddingsResponse = z.infer<
  typeof OpenRouterEmbeddingsResponseSchema
>;

interface CreateEmbeddingsInput {
  input: string | string[];
  model?: string;
}

export async function createOpenRouterEmbeddings({
  input,
  model = "openai/text-embedding-3-small",
}: CreateEmbeddingsInput): Promise<OpenRouterEmbeddingsResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      model,
    }),
  }).catch((error: unknown) => {
    throw new Error(`OpenRouter embeddings request failed: ${String(error)}`);
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter embeddings error ${response.status}: ${body ?? ""}`
    );
  }

  const json: unknown = await response.json().catch((error: unknown) => {
    throw new Error(`OpenRouter embeddings JSON parse error: ${String(error)}`);
  });

  const parsed = OpenRouterEmbeddingsResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid response");
  }

  return parsed.data;
}
