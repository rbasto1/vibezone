import type { z } from "zod";

export function safeParse<T>(
  json: string,
  schema: z.ZodType<T>
): T | undefined {
  try {
    return schema.parse(JSON.parse(json));
  } catch {
    return undefined;
  }
}
