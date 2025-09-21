import { convertToModelMessages, generateText } from "ai";
import { getOpenRouter } from "./lib/gateway";
import { getConfigFromRequest } from "./lib/request";
import type { Env } from "./worker";

export async function handleProviderComplete(
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

  const { modelId, maxTokens } = getConfigResult.config;
  const messages = getConfigResult.messages;

  const adapter = getOpenRouter(env);

  console.info({
    message: "Starting complete",
    modelId,
    messagesLength: messages.length,
  });

  try {
    const result = await generateText({
      model: adapter(modelId),
      messages: convertToModelMessages(messages),
      maxOutputTokens: maxTokens,
    });

    return Response.json(
      {
        text: result.text,
        finishReason: result.finishReason,
      },
      { status: 200, headers }
    );
  } catch (error: unknown) {
    console.error({ message: "Caught an error generating text:", error });
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500, headers });
  }
}
