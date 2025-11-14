import "server-only";

import { z } from "zod";
import { safeParse } from "../json";
import { cleanLlmJsonText, complete } from "../llm/complete";

const MemoryPreviewSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(2000),
});

const MemoryClassificationSchema = z.object({
  shouldCreate: z.boolean(),
});

interface WorkerCompletePayload {
  maxTokens: number;
  prompt: string;
}

const MEMORY_MODEL_ID = "openai/gpt-oss-120b:exacto";

async function callWorkerComplete(payload: WorkerCompletePayload) {
  const response = await complete(
    payload.prompt,
    MEMORY_MODEL_ID,
    payload.maxTokens
  );
  return response.data?.text.trim();
}

export async function generateMemoryPreview({
  text,
  projectName,
}: {
  text: string;
  projectName: string;
}): Promise<{ title: string; content: string } | null> {
  const trimmed = text.trim();
  if (!trimmed.length) {
    throw new Error("Memory text is empty");
  }

  const instructionLines = [
    "You are a note-taking assistant that summarizes long-term user or project context into concise memories.",
    "Read the provided text and extract ONLY the most durable facts or preferences that should help future conversations.",
    "Any information related only to the specific question or conversation should be ignored.",
    "Respond with a JSON object that matches this schema:",
    "- title: short label, less than 80 characters",
    "- content: 2-3 full sentences describing the memory",
    'interface MemoryResponse { "title": string, "content": string }',
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
    maxTokens: 2000,
    prompt: `${instructionLines.join("\n")}\n\n<text>\n${trimmed}\n</text>`,
  });

  console.log("unfiltered result", result);

  if (!result) return null;

  const cleanResult = cleanLlmJsonText(result);
  return safeParse(cleanResult, MemoryPreviewSchema) ?? null;
}

export async function classifyMemoryCandidate(text: string) {
  const trimmed = text.trim();
  if (!trimmed.length) {
    return { shouldCreate: false };
  }

  const output = await callWorkerComplete({
    maxTokens: 400,
    prompt: [
      "A user sent the following message in a chat.",
      "Determine if it contains background information about the user, their preferences, or their project that should be stored as a memory.",
      "Return a JSON object with fields:",
      "- shouldCreate: whether the message should be stored as a memory",
      'interface MemoryClassificationResponse { "shouldCreate": boolean }',
      "Only output JSON.",
      "",
      "<message>",
      trimmed,
      "</message>",
    ].join("\n"),
  });

  console.log("memory classifier output", output);

  const jsonText = cleanLlmJsonText(output ?? "");
  const memoryClassification = safeParse(jsonText, MemoryClassificationSchema);
  if (!memoryClassification) {
    return { shouldCreate: false };
  }
  return memoryClassification;
}
