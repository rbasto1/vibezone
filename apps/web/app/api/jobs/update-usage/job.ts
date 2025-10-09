import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { db } from "@/db";
import * as schema from "@/db/schema";

export const updateUsageQuery = `UPDATE usage AS u
  SET
    cost_prompt = COALESCE(
      u.cost_prompt,
      COALESCE(u.tokens_prompt, 0) * COALESCE((m.pricing ->> 'prompt')::numeric, 0::numeric)
    ),
    cost_completion = COALESCE(
      u.cost_completion,
      COALESCE(u.tokens_completion, 0) * COALESCE((m.pricing ->> 'completion')::numeric, 0::numeric)
    )
  FROM models AS m
  WHERE u.model_id = m.id
    AND (u.cost_prompt IS NULL OR u.cost_completion IS NULL);
`;

interface RunUpdateUsageOptions {
  databaseUrl?: string;
}

type DatabaseClient = typeof db;

const getClient = (databaseUrl?: string): DatabaseClient =>
  databaseUrl
    ? (drizzle(neon(databaseUrl), { schema }) as DatabaseClient)
    : db;

export const runUpdateUsage = ({ databaseUrl }: RunUpdateUsageOptions = {}) =>
  getClient(databaseUrl).execute(updateUsageQuery);

export type UpdateUsageResult = Awaited<ReturnType<typeof runUpdateUsage>>;
