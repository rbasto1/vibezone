import { pgEnum } from "drizzle-orm/pg-core";

export const providerTiers = pgEnum("provider_tier", [
  "leaders",
  "challengers",
  "specialists",
]);
