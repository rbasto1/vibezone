import { convertToModelMessages, streamText } from "ai";
import { waitUntil } from "cloudflare:workers";
import { getAdapterForProvider } from "./lib/gateway";
import { persistUsage } from "./lib/usage";
import { getUsageDO } from "./objects/usage";
import type { VibezoneContext } from "./worker";

export async function handleProviderStream(
  vzContext: VibezoneContext,
  headers: Headers
): Promise<Response> {
  const { env, completionRequest } = vzContext;
  const { modelId, providerId, adapterModelId, maxTokens, plugins } =
    completionRequest.config;
  const messages = completionRequest.messages;

  const pluginWeb = plugins.includes("web");

  const adapter = getAdapterForProvider(env, providerId, completionRequest);

  const modelSpecifier = pluginWeb
    ? `${adapterModelId}:online`
    : adapterModelId;

  const remainingQuota = vzContext.usageContext?.remainingQuota;
  const refund = () => {
    const { userKey, userId } = vzContext.usageContext ?? {};
    if (
      remainingQuota === null ||
      remainingQuota === undefined ||
      userId ||
      !userKey
    ) {
      return;
    }

    console.info({
      message: "Refunding anon user",
      userKey,
    });
    const stub = getUsageDO(env, userKey);
    stub.fetch("https://internal/credit", { method: "POST" });
  };

  console.info({
    message: "Starting stream",
    model: modelId,
    plugins: plugins.join(", "),
    user: vzContext.usageContext?.userId ?? vzContext.usageContext?.userKey,
  });

  const result = streamText({
    model: adapter(modelSpecifier),
    messages: convertToModelMessages(messages),
    maxOutputTokens: maxTokens ?? 4000,
    onError: (error) => {
      console.error({
        message: "streamText onError:",
        error,
      });
      refund();
    },
    abortSignal: vzContext.signal,
  });

  // Set headers for the stream response
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-store");
  headers.set("Connection", "keep-alive");
  headers.set("Transfer-Encoding", "chunked");
  headers.set("Content-Encoding", "identity");
  if (remainingQuota !== null && remainingQuota !== undefined) {
    headers.set("Access-Control-Expose-Headers", "X-Remaining-Quota");
    headers.set("X-Remaining-Quota", remainingQuota.toString());
  }

  return result.toUIMessageStreamResponse({
    headers,
    onError: (error) => {
      console.error({
        message: "toUIMessageStreamResponse onError:",
        error,
      });
      refund();
      if (error instanceof Error) {
        return error.message;
      }
      return "An error occurred";
    },
    onFinish: (e) => {
      waitUntil(
        persistUsage({
          vzContext,
          providerMetadata: result.providerMetadata,
          isAborted: e.isAborted,
        })
      );
    },
  });
}
