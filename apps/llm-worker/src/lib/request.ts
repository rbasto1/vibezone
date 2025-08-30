import { ChatMessage, ChatRequestSchema } from "./schemas";

export type GetConfigResponse =
  | GetConfigResponseSuccess
  | GetConfigResponseError;

export interface GetConfigResponseSuccess {
  type: "success";
  config: {
    modelId: string;
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

  const modelId = request.headers.get("x-vz-model-id");
  if (!modelId) {
    return { type: "error", error: "Missing model id" };
  }

  return {
    type: "success",
    config: {
      modelId,
    },
    messages: bodyParse.data.messages,
    error: null,
  };
}
