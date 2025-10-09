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

  const adapter = getOpenRouter(env, completionRequest);

  const messages = convertToModelMessages(requestMessages);

  try {
    const result = await generateText({
      model: adapter(modelId),
      messages,
      maxOutputTokens: maxTokens,
      temperature: 0.1,
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
