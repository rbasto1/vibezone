import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

const query = `UPDATE usage AS u
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

function main() {
  const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Usage:\n\n  pnpm run update-usage <DATABASE_URL>\n");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  db.execute(query).then((output) => console.info("Success:", output));
}

main();
