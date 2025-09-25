import { convertToModelMessages, generateText } from "ai";
import { getOpenRouter } from "./lib/gateway";
import type { VibezoneContext } from "./worker";

export async function handleProviderComplete(
  vzContext: VibezoneContext,
  headers: Headers
): Promise<Response> {
  const { env, completionRequest } = vzContext;
  const { modelId, maxTokens } = completionRequest.config;
  const messages = completionRequest.messages;

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
      temperature: 0.1,
    });
    console.info({
      message: "Complete finished",
      result: result.text,
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
