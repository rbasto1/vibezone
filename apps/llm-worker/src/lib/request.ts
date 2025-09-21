import type { ChatMessage } from "./schemas";
import { ChatRequestSchema } from "./schemas";

export type GetConfigResponse =
  | GetConfigResponseSuccess
  | GetConfigResponseError;

export interface GetConfigResponseSuccess {
  type: "success";
  config: {
    modelId: string;
    maxTokens: number | undefined;
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
  rawBody: unknown
): GetConfigResponse {
  const bodyParse = ChatRequestSchema.safeParse(rawBody);
  if (!bodyParse.success) {
    console.error({
      message: "Zod validation failed",
      error: bodyParse.error,
    });
    return {
      type: "error",
      error: bodyParse.error.issues[0]?.message ?? "Parse error",
    };
  }

  const modelId = request.headers.get("x-vz-model-id");
  if (!modelId) {
    console.error({ message: "Missing model id header" });
    return { type: "error", error: "Missing model id" };
  }

  return {
    type: "success",
    config: {
      modelId,
      maxTokens: bodyParse.data.maxTokens,
    },
    messages: bodyParse.data.messages,
    error: null,
  };
}
