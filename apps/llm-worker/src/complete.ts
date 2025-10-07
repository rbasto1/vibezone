import { convertToModelMessages, generateText } from "ai";
import { getOpenRouter } from "./lib/gateway";
import type { VibezoneContext } from "./worker";

export async function handleProviderComplete(
  vzContext: VibezoneContext,
  headers: Headers
): Promise<Response> {
  const { env, completionRequest } = vzContext;
  const { modelId, maxTokens } = completionRequest.config;
  const requestMessages = completionRequest.messages;

  const adapter = getOpenRouter(env, []);

  const messages = convertToModelMessages(requestMessages);
  console.info({
    message: "Starting completion",
    model: modelId,
    input: messages[0]?.content,
  });

  try {
    const result = await generateText({
      model: adapter(modelId),
      messages,
      maxOutputTokens: maxTokens,
      temperature: 0.1,
    });
    console.info({
      message: "Completion finished",
      text: result.text,
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
