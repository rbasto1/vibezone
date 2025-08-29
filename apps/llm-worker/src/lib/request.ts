import {
  ChatMessage,
  ChatRequestSchema,
  Provider,
  ProviderSchema,
} from "./schemas";

export type GetConfigResponse =
  | GetConfigResponseSuccess
  | GetConfigResponseError;

export interface GetConfigResponseSuccess {
  type: "success";
  config: {
    provider: Provider;
    model: string;
  };
  messages: ChatMessage[];
  error: null;
}

interface GetConfigResponseError {
  type: "error";
  error: string;
  config?: null;
  messages?: null;
}

export function getConfigFromRequest(
  request: Request,
  rawBody: any
): GetConfigResponse {
  console.log(`Stream request:`, JSON.stringify(rawBody, null, 2));
  const bodyParse = ChatRequestSchema.safeParse(rawBody);
  if (!bodyParse.success) {
    return {
      type: "error",
      error: bodyParse.error.issues[0]?.message ?? "Parse error",
    };
  }

  const providerHeader = request.headers.get("x-vz-provider");
  const providerParse = ProviderSchema.safeParse(providerHeader);
  if (!providerParse.success) {
    return {
      type: "error",
      error: providerParse.error.issues[0]?.message ?? "Parse error",
    };
  }
  const provider = providerParse.data;

  const model = request.headers.get("x-vz-model");
  if (!model) {
    return { type: "error", error: "Missing model" };
  }

  return {
    type: "success",
    config: {
      provider,
      model,
    },
    messages: bodyParse.data.messages,
    error: null,
  };
}
