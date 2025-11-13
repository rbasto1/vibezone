import "server-only";

import { INTERNAL_SECRET } from "@/lib/constants";
import { z } from "zod";

const WorkerCompleteResponseSchema = z.object({
  text: z.string().min(1),
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

const MemoryPreviewSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(2000),
});

const MemoryClassificationSchema = z.object({
  shouldCreate: z.boolean(),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0),
  reason: z.string().optional(),
});

interface WorkerCompletePayload {
  id: string;
  maxTokens: number;
  messages: Array<{
    id: string;
    role: "user";
    parts: Array<{ type: "text"; text: string }>;
  }>;
}

const MEMORY_MODEL_ID = "meta-llama/llama-3.2-3b-instruct";

async function callWorkerComplete(payload: WorkerCompletePayload) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vz-model-id": MEMORY_MODEL_ID,
        Authorization: `Internal ${INTERNAL_SECRET}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Worker request failed with status ${response.status}`);
  }

  const json: unknown = await response.json();
  const parsed = WorkerCompleteResponseSchema.parse(json);
  if (parsed.finishReason !== "stop") {
    throw new Error(`Worker finished with status ${parsed.finishReason}`);
  }
  return parsed.text.trim();
}

export async function generateMemoryPreview({
  text,
  projectName,
}: {
  text: string;
  projectName?: string | null;
}): Promise<{ title: string; content: string }> {
  const trimmed = text.trim();
  if (!trimmed.length) {
    throw new Error("Memory text is empty");
  }

  const instructionLines = [
    "You are a note-taking assistant that summarizes long-term user or project context into concise memories.",
    "Read the provided text and extract the most durable facts or preferences that should help future conversations.",
    "Respond with a JSON object that matches this schema:",
    '{ "title": "<short label, <= 80 characters>", "content": "<2-3 full sentences describing the memory>" }',
    "Only output the JSON object and nothing else.",
  ];

  if (projectName) {
    instructionLines.splice(
      1,
      0,
      `The current project is named "${projectName}".`
    );
  }

  const result = await callWorkerComplete({
    id: "memory-preview",
    maxTokens: 200,
    messages: [
      {
        id: "user",
        role: "user",
        parts: [
          {
            type: "text",
            text: `${instructionLines.join(
              "\n"
            )}\n\n<text>\n${trimmed}\n</text>`,
          },
        ],
      },
    ],
  });

  const parsedJson = JSON.parse(result) as unknown;
  const preview = MemoryPreviewSchema.parse(parsedJson);
  return preview;
}

export async function classifyMemoryCandidate(text: string) {
  const trimmed = text.trim();
  if (!trimmed.length) {
    return { shouldCreate: false, confidence: 0 };
  }

  const output = await callWorkerComplete({
    id: "memory-classifier",
    maxTokens: 64,
    messages: [
      {
        id: "user",
        role: "user",
        parts: [
          {
            type: "text",
            text: [
              "A user sent the following message in a chat.",
              "Determine if it contains background information about the user, their preferences, or their project that should be stored as a memory.",
              "Return a JSON object with fields:",
              '{ "shouldCreate": true|false, "confidence": number between 0 and 1, "reason": "<short explanation>" }',
              "Only output JSON.",
              "",
              "<message>",
              trimmed,
              "</message>",
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const parsedJson = JSON.parse(output) as unknown;
  return MemoryClassificationSchema.parse(parsedJson);
}
