import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const timestampTz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });
const timestampTzNow = (name: string) =>
  timestampTz(name).defaultNow().notNull();

export const providerTiers = pgEnum("provider_tier", [
  "leaders",
  "challengers",
  "specialists",
]);

export const providers = pgTable("providers", {
  id: text("id").primaryKey(), // openai, anthropic, gemini, etc.
  name: text("name").notNull(),
  tier: providerTiers().default("specialists"),
  createdAt: timestampTzNow("created_at"),
});

export const models = pgTable("models", {
  // OpenRouter id, e.g. "openai/gpt-4o-mini"
  id: text("id").primaryKey(),
  // provider prefix, e.g. "openai", "anthropic", "qwen"
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id),
  // human name from OpenRouter
  name: text("name").notNull(),
  canonicalSlug: text("canonical_slug"),
  huggingFaceId: text("hugging_face_id"),
  description: text("description"),
  // flattened architecture fields
  architectureModality: text("architecture_modality"),
  architectureInputModalities: text("architecture_input_modalities").array(),
  architectureOutputModalities: text("architecture_output_modalities").array(),
  architectureTokenizer: text("architecture_tokenizer"),
  architectureInstructType: text("architecture_instruct_type"),
  // keep pricing and top_provider as JSONB
  pricing: jsonb("pricing"),
  topProvider: jsonb("top_provider"),
  perRequestLimits: jsonb("per_request_limits"),
  // created from API (epoch seconds) -> timestamptz
  createdAt: timestampTzNow("created_at"),

  // VIBEZONE specific fields
  // UI selection priority for default panels
  priority: integer("priority"),
  isFlagship: boolean("is_flagship"),
  isCoder: boolean("is_coder"),
  isArtist: boolean("is_artist"),
  updatedAt: timestampTzNow("updated_at"),
  // soft delete
  deletedAt: timestampTz("deleted_at"),
});

export const supportedParameters = pgTable("supported_parameters", {
  // same as OpenRouter parameter id, e.g. "reasoning", "seed"
  id: text("supported_parameter_id").primaryKey(),
  label: text("label").notNull(),
  iconUrl: text("icon_url"),
  color: text("color"),
  createdAt: timestampTzNow("created_at"),
});

export const modelSupportedParameters = pgTable("model_supported_parameters", {
  modelId: text("model_id")
    .notNull()
    .references(() => models.id),
  supportedParameterId: text("supported_parameter_id")
    .notNull()
    .references(() => supportedParameters.id),
});

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type SupportedParameter = typeof supportedParameters.$inferSelect;
export type NewSupportedParameter = typeof supportedParameters.$inferInsert;
