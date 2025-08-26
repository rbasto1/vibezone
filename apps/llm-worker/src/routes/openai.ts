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
type ChatConfig = z.infer<typeof ChatConfigSchema>;
type ChatRequest = z.infer<typeof ChatRequestSchema>;

export async function handleOpenAIStream(
  request: Request,
  env: Env,
  headers: Headers,
): Promise<Response> {
  // Check if API key is available
  if (!env.OPENAI_API_KEY) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500, headers },
    );
  }

  try {
    // Parse and validate request body with Zod
    const rawBody = await request.json();
    const body = ChatRequestSchema.parse(rawBody);

    // Handle both AI SDK format (prompt) and legacy format (messages)
    let prompt: string;
    let messages: ChatMessage[] | undefined;

    if (body.prompt) {
      // AI SDK format
      prompt = body.prompt;
    } else if (
      body.messages &&
      Array.isArray(body.messages) &&
      body.messages.length > 0
    ) {
      // Legacy format - convert messages to prompt
      messages = body.messages;
      // For now, just use the last user message as prompt
      const lastUserMessage = body.messages.find(
        (msg: ChatMessage) => msg.role === "user",
      );
      if (!lastUserMessage) {
        return Response.json(
          { error: "No user message found" },
          { status: 400, headers },
        );
      }
      prompt = lastUserMessage.content;
    } else {
      return Response.json(
        { error: "prompt or messages required" },
        { status: 400, headers },
      );
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
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid request format",
          details: error.issues.map(
            (e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`,
          ),
        },
        { status: 400, headers },
      );
    }

    // Handle abort errors gracefully
    if (error instanceof Error && error.name === "AbortError") {
      return new Response(null, { status: 499, headers });
    }

    console.error("OpenAI streaming error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers },
    );
  }
}
