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
export const ChatMessagePartFileSchema = z.object({
  type: z.literal("file"),
  url: z.string(),
  filename: z.string(),
  mediaType: z.string(),
});

export const ChatMessagePartSchema = z.union([
  ChatMessagePartTextSchema,
  ChatMessagePartStepStartSchema,
  ChatMessagePartReasoningSchema,
  ChatMessagePartFileSchema,
]);

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(ChatMessagePartSchema),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ProviderSchema = z.enum(["openai", "anthropic"]);
export type Provider = z.infer<typeof ProviderSchema>;

export const ChatRequestSchema = z.object({
  id: z.string(),
  messages: z.array(ChatMessageSchema),
  trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  maxTokens: z.number().int().positive().optional(),
});
