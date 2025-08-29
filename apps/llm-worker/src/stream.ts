import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import { ChatRequestSchema, Provider } from "./lib/schemas";
import type { Env } from "./types";

export async function handleProviderStream(
  request: Request,
  env: Env,
  headers: Headers
): Promise<Response> {
  const rawBody = await request.json().catch((error) => new Error(error));
  if (rawBody instanceof Error) {
    return Response.json(
      { error: `Body is invalid json: ${rawBody.message}` },
      { status: 400, headers }
    );
  }

  console.log(`Stream request:`, JSON.stringify(rawBody, null, 2));
  const bodyParse = ChatRequestSchema.safeParse(rawBody);
  if (!bodyParse.success) {
    return Response.json(
      { error: `Invalid request: ${bodyParse.error.issues[0]?.message}` },
      { status: 400, headers }
    );
  }

  const { config, messages } = bodyParse.data;
  const { provider, model, temperature } = config;

  const apiKey = getApiKey(env, provider);
  if (!apiKey) {
    return Response.json(
      { error: `No API key found for provider "${provider}"` },
      { status: 500, headers }
    );
  }
  const providerClient = createProvider(provider, apiKey);

  const result = streamText({
    model: providerClient(model),
    messages: convertToModelMessages(messages),
    temperature: temperature ?? undefined,
  });

  // Set headers for streaming
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-store");
  headers.set("Connection", "keep-alive");

  // Return the streaming response
  return result.toUIMessageStreamResponse({ headers });
}

function getApiKey(env: Env, provider: Provider): string {
  switch (provider) {
    case "openai":
      return env.OPENAI_API_KEY;
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
  }
}

function createProvider(provider: Provider, apiKey: string) {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey });
    case "anthropic":
      return createAnthropic({ apiKey });
  }
}
