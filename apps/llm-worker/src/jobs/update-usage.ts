import { getDb } from "../lib/db";
import type { Env } from "../worker";

export const runUpdateUsage = (env: Env) => {
  const db = getDb(env);

  return db.execute(`UPDATE usage AS u
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
`);
};

export type UpdateUsageResult = Awaited<ReturnType<typeof runUpdateUsage>>;
