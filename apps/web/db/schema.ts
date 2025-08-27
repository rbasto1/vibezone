import { boolean, pgTable, text, varchar } from "drizzle-orm/pg-core";

export const providers = pgTable("providers", {
  id: varchar("id", { length: 50 }).primaryKey(), // openai, anthropic, gemini, etc.
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
});

export const models = pgTable("models", {
  id: varchar("id", { length: 100 }).primaryKey(), // claude-3.7-reasoning, gpt-4, etc.
  providerId: varchar("provider_id", { length: 50 })
    .notNull()
    .references(() => providers.id),
  name: text("name").notNull(),
  isExperimental: boolean("is_experimental").default(false),
  isPremium: boolean("is_premium").default(false),
  isNew: boolean("is_new").default(false),
  isIncluded: boolean("is_included").default(true),
  capabilityFast: boolean("capability_fast").default(false),
  capabilityVision: boolean("capability_vision").default(false),
  capabilityPdf: boolean("capability_pdf").default(false),
  capabilityReasoning: boolean("capability_reasoning").default(false),
  capabilityImageGeneration: boolean("capability_image_generation").default(
    false
  ),
  capabilityTools: boolean("capability_tools").default(false),
  capabilityEffortControl: boolean("capability_effort_control").default(false),
});

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
