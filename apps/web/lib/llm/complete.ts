import { z } from "zod";

import { INTERNAL_SECRET } from "../constants";

export const WorkerCompleteResponseSchema = z.object({
  text: z.string().nonempty(),
  finishReason: z.enum([
    "stop",
    "length",
    "content-filter",
    "tool-calls",
    "error",
    "other",
    "unknown",
  ]),
});
type WorkerCompleteResponse = z.infer<typeof WorkerCompleteResponseSchema>;

export async function complete(
  prompt: string,
  modelId: string,
  maxTokens: number
): Promise<z.ZodSafeParseResult<WorkerCompleteResponse>> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/complete`,
    {
      method: "POST",
      body: JSON.stringify({
        id: "1",
        maxTokens,
        messages: [
          {
            id: "1",
            role: "user",
            parts: [
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
      headers: {
        "Content-Type": "application/json",
        "x-vz-model-id": modelId,
        Authorization: `Internal ${INTERNAL_SECRET}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Worker request failed with status: ${response.status}`);
  }

  const completion: unknown = await response.json();
  return WorkerCompleteResponseSchema.safeParse(completion);
}

export function cleanLlmJsonText(text: string): string {
  return text
    .replace(/^```json\n|```\s*$/g, "")
    .replace(/<think>\s+/g, "")
    .replace(/\s{2,}/g, " ");
}
