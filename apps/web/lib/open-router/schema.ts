import { z } from "zod";

export const OpenRouterModelSchema = z.object({
  id: z.string(),
  canonical_slug: z.string(),
  hugging_face_id: z.string().nullable().optional(),
  name: z.string(),
  created: z.number(), // epoch seconds
  description: z.string(),
  architecture: z.object({
    modality: z.string(),
    input_modalities: z.array(z.string()),
    output_modalities: z.array(z.string()),
    tokenizer: z.string(),
    instruct_type: z.string().nullable().optional(),
  }),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
    image: z.string().optional(),
    request: z.string().optional(),
    web_search: z.string().optional(),
    internal_reasoning: z.string().optional(),
    input_cache_read: z.string().optional(),
    input_cache_write: z.string().optional(),
  }),
  top_provider: z.object({
    context_length: z.number().nullable(),
    is_moderated: z.boolean(),
    max_completion_tokens: z.number().nullable(),
  }),
  per_request_limits: z.any().nullable().optional(),
  supported_parameters: z.array(z.string()),
});

export const OpenRouterModelsResponse = z.object({
  data: z.array(OpenRouterModelSchema),
});

export const MaritacaAIModelSchema = z.object({
  id: z.string(),
  object: z.literal("model"),
  created: z.number(),
  owned_by: z.string(),
});

export const MaritacaAIModelsResponse = z.object({
  object: z.literal("list"),
  data: z.array(MaritacaAIModelSchema),
});
