import { convertToModelMessages, streamText } from "ai";
import { waitUntil } from "cloudflare:workers";
import { getOpenRouter } from "./lib/gateway";
import { persistUsage } from "./lib/usage";
import type { VibezoneContext } from "./worker";

export async function handleProviderStream(
  request: Request,
  headers: Headers,
  vzContext: VibezoneContext
): Promise<Response> {
  const { env, completionRequest } = vzContext;
  const { modelId, maxTokens } = completionRequest.config;
  const messages = completionRequest.messages;

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
      waitUntil(
        persistUsage({
          request,
          vzContext,
          providerMetadata: result.providerMetadata,
          isAborted: e.isAborted,
        })
      );
    },
  });
}
