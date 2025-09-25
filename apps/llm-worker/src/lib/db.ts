import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import type { Env } from "../worker";

import * as schema from "../../../web/db/schema";

type Database = NeonHttpDatabase<typeof schema>;

export function getDb(env: Env): Database {
  const db = neon(env.DATABASE_URL);
  return drizzle(db, { schema });
}

export { schema };
