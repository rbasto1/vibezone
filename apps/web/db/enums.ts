import { pgEnum } from "drizzle-orm/pg-core";

export const providerTiers = pgEnum("provider_tier", [
  "leaders",
  "challengers",
  "specialists",
]);

export const reasoningEffort = pgEnum("reasoning_effort", [
  "none",
  "low",
  "medium",
  "high",
]);
