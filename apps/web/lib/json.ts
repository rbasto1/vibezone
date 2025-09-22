import type { z } from "zod";

export function safeParse<T = unknown>(
  json: string,
  schema?: z.ZodType<T>
): T | undefined {
  try {
    if (schema) {
      return schema.parse(JSON.parse(json));
    } else {
      return JSON.parse(json);
    }
  } catch {
    return undefined;
  }
}
