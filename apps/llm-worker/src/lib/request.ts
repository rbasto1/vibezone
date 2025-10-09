import type { ChatMessage } from "./schemas";
import { ChatRequestSchema } from "./schemas";

export type GetConfigResponse =
  | GetConfigResponseSuccess
  | GetConfigResponseError;

export interface GetConfigResponseSuccess {
  type: "success";
  config: {
    modelId: string;
    providerId: string;
    adapterModelId: string;
    maxTokens: number;
    plugins: string[];
  };
  messages: ChatMessage[];
}

interface GetConfigResponseError {
  type: "error";
  error: string;
  config?: null;
  messages?: null;
}

export function getConfigFromRequest(
  request: Request,
  rawBody: unknown
): GetConfigResponse {
  const bodyParse = ChatRequestSchema.safeParse(rawBody);
  if (!bodyParse.success) {
    console.error({
      message: "Zod validation failed",
      error: bodyParse.error,
      body: rawBody,
    });
    return {
      type: "error",
      error: bodyParse.error.issues[0]?.message ?? "Parse error",
    };
  }

  const modelKey = request.headers.get("x-vz-model-id");
  if (!modelKey) {
    console.error({ message: "Missing model id header" });
    return { type: "error", error: "Missing model id" };
  }

  const [modelId, plugins] = modelKey.split("#");
  if (!modelId) throw new Error("Assert: split returns a string");

  const providerId = modelId.split("/")[0] ?? modelId;
  const pluginList = plugins
    ? plugins.split(",").filter((plugin) => !!plugin)
    : [];

  return {
    type: "success",
    config: {
      modelId,
      providerId,
      adapterModelId: getAdapterModelId(modelId),
      plugins: getValidPlugins(providerId, pluginList),
      maxTokens:
        (bodyParse.data.maxTokens ?? providerId === "maritacaai")
          ? 12000
          : 32000,
    },
    messages: bodyParse.data.messages,
  };
}

function getAdapterModelId(modelId: string) {
  const [prePlugins] = modelId.split("#");
  if (!prePlugins) throw new Error("Assert: split returns a string");
  switch (prePlugins.split("/")[0]) {
    case "maritacaai":
      return modelId.split("/")[1]!;
    default:
      return modelId;
  }
}

function getValidPlugins(providerId: string, plugins: string[]) {
  switch (providerId) {
    case "maritacaai":
      return [];
    default:
      return plugins.filter(
        (plugin) => plugin === "web" || plugin.startsWith("reason-")
      );
  }
}
