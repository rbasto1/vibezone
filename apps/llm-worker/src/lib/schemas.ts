import { z } from "zod";

export const ChatMessagePartTextSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});
export const ChatMessagePartStepStartSchema = z.object({
  type: z.literal("step-start"),
});
export const ChatMessagePartReasoningSchema = z.object({
  type: z.literal("reasoning"),
  text: z.string(),
  providerMetadata: z
    .object({
      openai: z.object({
        itemId: z.string(),
        reasoningEncryptedContent: z.any(),
      }),
    })
    .optional(),
  state: z.enum(["done"]),
});

export const ChatMessagePartSchema = z.union([
  ChatMessagePartTextSchema,
  ChatMessagePartStepStartSchema,
  ChatMessagePartReasoningSchema,
]);

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(ChatMessagePartSchema),
});

export const ProviderSchema = z.enum(["openai", "anthropic"]);
export type Provider = z.infer<typeof ProviderSchema>;

export const ChatConfigSchema = z.object({
  provider: ProviderSchema,
  model: z.string(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxTokens: z.number().min(1).max(4000).nullable().optional(),
});

export const ChatRequestSchema = z.object({
  id: z.string(),
  messages: z.array(ChatMessageSchema),
  trigger: z.enum(["submit-message"]),
  config: ChatConfigSchema,
});
