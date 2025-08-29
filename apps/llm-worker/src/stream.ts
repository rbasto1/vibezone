import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import { getApiKey } from "./lib/api-keys";
import { getConfigFromRequest } from "./lib/request";
import { Provider } from "./lib/schemas";

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

  const getConfigResult = getConfigFromRequest(request, rawBody);
  if (getConfigResult.type === "error") {
    return Response.json(
      { error: getConfigResult.error },
      { status: 400, headers }
    );
  }

  const { provider, model } = getConfigResult.config;
  const messages = getConfigResult.messages;

  const apiKey = getApiKey(env, provider);
  if (!apiKey) {
    return Response.json(
      { error: `No API key found for provider "${provider}"` },
      { status: 500, headers }
    );
  }

  const adapter = createProvider(provider, apiKey);

  const result = streamText({
    model: adapter(model),
    messages: convertToModelMessages(messages),
    onError: (error) => {
      console.error("Caught an error creating stream text:", error);
    },
  });

  // Set headers for streaming
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-store");
  headers.set("Connection", "keep-alive");
  headers.set("Transfer-Encoding", "chunked");
  headers.set("Content-Encoding", "identity");

  // Return the streaming response
  return result.toUIMessageStreamResponse({ headers });
}

function createProvider(provider: Provider, apiKey: string) {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey });
    case "anthropic":
      return createAnthropic({ apiKey });
  }
}
