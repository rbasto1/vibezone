import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import type { Env } from "../types";

const DEFAULT_MODEL = "gpt-4o-mini";

// Zod schemas for request validation
const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const ChatConfigSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  model: z.string().optional(),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).optional(),
  prompt: z.string().optional(),
  config: ChatConfigSchema.optional(),
});

type ChatMessage = z.infer<typeof ChatMessageSchema>;
type ChatRequest = z.infer<typeof ChatRequestSchema>;

export async function handleOpenAIStream(
  request: Request,
  env: Env,
  headers: Headers
): Promise<Response> {
  // Check if API key is available
  if (!env.OPENAI_API_KEY) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500, headers }
    );
  }

  // Parse and validate request body with Zod
  const rawBody = await request.json();
  const body = ChatRequestSchema.parse(rawBody);

  const prompt = getRequest(body, headers);
  if (prompt instanceof Response) {
    return prompt;
  }

  // Create streaming response using AI SDK
  const result = streamText({
    model: openai(body.config?.model ?? DEFAULT_MODEL),
    prompt,
    temperature: body.config?.temperature ?? 0.2,
    maxOutputTokens: body.config?.maxTokens ?? 512,
    providerOptions: {
      openai: {
        apiKey: env.OPENAI_API_KEY,
      },
    },
  });

  // Set headers for streaming
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-store");
  headers.set("Connection", "keep-alive");

  // Return the streaming response
  return result.toUIMessageStreamResponse();
}

function getRequest(body: ChatRequest, headers: Headers): string | Response {
  // Handle both AI SDK format (prompt) and legacy format (messages)
  if (body.prompt) {
    // AI SDK format
    return body.prompt;
  }

  if (!!body.messages?.length) {
    // Legacy format - convert messages to prompt

    // For now, just use the last user message as prompt
    const lastUserMessage = body.messages.find(
      (msg: ChatMessage) => msg.role === "user"
    );

    if (!lastUserMessage) {
      return Response.json(
        { error: "No user message found" },
        { status: 400, headers }
      );
    }
    return lastUserMessage.content;
  }

  return Response.json(
    { error: "prompt or messages required" },
    { status: 400, headers }
  );
}
