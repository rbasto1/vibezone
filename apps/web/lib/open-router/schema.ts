import { z } from "zod";

export const OpenRouterModelSchema = z.object({
  id: z.string(),
  canonical_slug: z.string().nullable().optional(),
  hugging_face_id: z.string().nullable().optional(),
  name: z.string(),
  created: z.number(), // epoch seconds
  description: z.string().nullable().optional(),
  architecture: z.object({
    modality: z.string().nullable().optional(),
    input_modalities: z.array(z.string()).nullable().optional(),
    output_modalities: z.array(z.string()).nullable().optional(),
    tokenizer: z.string().nullable().optional(),
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
