import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText } from "ai";
import { ChatRequestSchema } from "../lib/schemas";
import type { Env } from "../types";

export async function handleAnthropicStream(
  request: Request,
  env: Env,
  headers: Headers
): Promise<Response> {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing ANTHROPIC_API_KEY" },
      { status: 500, headers }
    );
  }

  // Parse and validate request body with Zod
  const rawBody = await request.json();
  console.log("request body:", JSON.stringify(rawBody, null, 2));
  const body = ChatRequestSchema.parse(rawBody);

  const messages = convertToModelMessages(body.messages);

  const anthropic = createAnthropic({ apiKey });
  const result = streamText({
    model: anthropic(body.config.model),
    messages,
    temperature: body.config.temperature ?? undefined,
  });

  // Set headers for streaming
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-store");
  headers.set("Connection", "keep-alive");

  // Return the streaming response
  return result.toUIMessageStreamResponse({ headers });
}
