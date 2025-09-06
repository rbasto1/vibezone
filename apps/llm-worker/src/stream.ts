import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText } from "ai";
import { getGatewayConfig } from "./lib/gateway";
import { getConfigFromRequest } from "./lib/request";

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

  const { modelId } = getConfigResult.config;
  const messages = getConfigResult.messages;

  const gateway = getGatewayConfig(env);
  const adapter = createOpenRouter({
    apiKey: gateway.apiKey,
    headers: gateway.headers,
  });

  console.log(
    `Starting stream (modelId=${modelId} messages=${messages.length})`
  );

  const result = streamText({
    model: adapter(modelId),
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
