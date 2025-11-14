import "server-only";

import { createOpenRouterEmbeddings } from "../open-router/embeddings";

export const MEMORY_EMBEDDING_MODEL = "openai/text-embedding-3-small" as const;
export const MEMORY_DUPLICATE_SIMILARITY_THRESHOLD = 0.93;

const combineMemoryText = (title: string, content: string): string => {
  const sections = [title.trim(), content.trim()].filter(
    (section) => section.length > 0
  );
  const combined = sections.join("\n\n").trim();
  if (!combined.length) {
    throw new Error("Memory embedding input is empty");
  }
  return combined;
};

export const createMemoryEmbedding = async (
  title: string,
  content: string
): Promise<number[]> => {
  const combined = combineMemoryText(title, content);
  const embeddings = await createOpenRouterEmbeddings({
    input: combined,
    model: MEMORY_EMBEDDING_MODEL,
  });
  const vector = embeddings.data[0]?.embedding;
  if (!vector?.length) {
    throw new Error("OpenRouter did not return an embedding vector");
  }
  return vector;
};
