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
  pricing: z.any(),
  top_provider: z.any(),
  per_request_limits: z.any().nullable().optional(),
  supported_parameters: z.array(z.string()),
});

export const OpenRouterModelsResponse = z.object({
  data: z.array(OpenRouterModelSchema),
});
