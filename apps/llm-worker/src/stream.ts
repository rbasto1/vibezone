import { convertToModelMessages, streamText } from "ai";
import type { TextStreamPart, ToolSet } from "ai";
import { waitUntil } from "cloudflare:workers";
import { getAdapterForProvider } from "./lib/gateway";
import { printLogInfo } from "./lib/log";
import { persistUsage } from "./lib/usage";
import { getUsageDO } from "./objects/usage";
import type { VibezoneContext } from "./worker";

export function handleProviderStream(
  vzContext: VibezoneContext,
  headers: Headers
): Response {
  const { env, completionRequest } = vzContext;
  const { providerId, adapterModelId, plugins } = completionRequest.config;
  const messages = completionRequest.messages;

  const pluginWeb = plugins.includes("web");

  const adapter = getAdapterForProvider(env, providerId, completionRequest);

  const modelSpecifier = pluginWeb
    ? `${adapterModelId}:online`
    : adapterModelId;

  const remainingQuota = vzContext.usageContext?.remainingQuota;
  const refund = async () => {
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
    return stub.fetch("https://internal/credit", { method: "POST" });
  };

  printLogInfo(vzContext);

  let responseStartedAt: number | null = null;

  const baseCustomMetadata = {
    model: completionRequest.config.modelId,
  };

  const getMessageMetadata = ({
    part,
  }: {
    part: TextStreamPart<ToolSet>;
  }) => {
    if (part.type === "start") {
      responseStartedAt = Date.now();
      return {
        custom: { ...baseCustomMetadata },
      };
    }

    if (part.type === "finish" || part.type === "abort") {
      const finishedAt = Date.now();
      const duration =
        responseStartedAt !== null ? finishedAt - responseStartedAt : null;

      return {
        custom: {
          ...baseCustomMetadata,
          ...(duration !== null ? { duration } : {}),
        },
      };
    }

    return undefined;
  };

  const result = streamText({
    model: adapter(modelSpecifier),
    messages: convertToModelMessages(messages),
    onError: (error) => {
      console.error({
        message: "streamText onError:",
        error,
      });
      waitUntil(refund());
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
    messageMetadata: getMessageMetadata,
    onError: (error) => {
      console.error({
        message: "toUIMessageStreamResponse onError:",
        error,
      });
      waitUntil(refund());
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
