import { convertToModelMessages, streamText } from "ai";
import { getOpenRouter } from "./lib/gateway";
import { getConfigFromRequest } from "./lib/request";
import type { Env } from "./worker";

export async function handleProviderStream(
  request: Request,
  env: Env,
  headers: Headers
): Promise<Response> {
  const rawBody = await request.json().catch((error) => new Error(error));
  if (rawBody instanceof Error) {
    return new Response("Invalid json body", {
      status: 400,
      headers,
    });
  }

  const getConfigResult = getConfigFromRequest(request, rawBody);
  if (getConfigResult.type === "error") {
    return new Response(getConfigResult.error, { status: 400, headers });
  }

  const { modelId, maxTokens } = getConfigResult.config;
  const messages = getConfigResult.messages;

  const adapter = getOpenRouter(env);

  console.info(
    `Starting stream (modelId=${modelId} messages=${messages.length})`
  );

  const result = streamText({
    model: adapter(`${modelId}:online`),
    messages: convertToModelMessages(messages),
    maxOutputTokens: maxTokens,
    onError: (error) => {
      console.error({
        message: "Caught an error creating stream text:",
        error,
      });
    },
    abortSignal: request.signal,
  });

  // Set headers for streaming
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-store");
  headers.set("Connection", "keep-alive");
  headers.set("Transfer-Encoding", "chunked");
  headers.set("Content-Encoding", "identity");

  // Return the streaming response
  return result.toUIMessageStreamResponse({
    headers,
    onFinish: (e) => {
      console.debug({
        message: "Stream event finished:",
        id: e.responseMessage.id,
      });
    },
  });
}
