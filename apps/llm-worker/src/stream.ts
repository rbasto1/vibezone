import { convertToModelMessages, streamText } from "ai";
import { waitUntil } from "cloudflare:workers";
import { getAdapterForProvider } from "./lib/gateway";
import { persistUsage } from "./lib/usage";
import type { VibezoneContext } from "./worker";

export async function handleProviderStream(
  request: Request,
  headers: Headers,
  vzContext: VibezoneContext
): Promise<Response> {
  const { env, completionRequest } = vzContext;
  const {
    modelId,
    providerId,
    adapterModelId,
    maxTokens,
    plugins: configPlugins,
  } = completionRequest.config;
  const messages = completionRequest.messages;

  // Parse modelId for plugins
  const parsedPlugins = getPlugins(modelId);

  const plugins = [...configPlugins, ...parsedPlugins];
  const pluginWeb = plugins.includes("web");
  const reasonPlugin = plugins.find((p) => p.startsWith("reason-"));
  const reasoningEffort = reasonPlugin
    ? reasonPlugin.replace("reason-", "")
    : null;

  const isMaritacaModel = providerId === "maritacaai";
  const adapter = getAdapterForProvider(env, providerId);

  const modelSpecifier =
    pluginWeb && !isMaritacaModel ? `${adapterModelId}:online` : adapterModelId;

  console.info({
    message: "Starting stream",
    model: modelId,
    pluginWeb,
    reasoningEffort,
  });

  const result = streamText({
    model: adapter(modelSpecifier),
    messages: convertToModelMessages(messages),
    maxOutputTokens: maxTokens,
    ...(reasoningEffort && { effort: reasoningEffort }),
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

function getPlugins(modelId: string) {
  if (!modelId.includes("#")) {
    return [];
  }

  const parts = modelId.split("#");
  const pluginsStr = parts[1];
  if (pluginsStr) {
    return pluginsStr.split(",");
  } else {
    return [];
  }
}
