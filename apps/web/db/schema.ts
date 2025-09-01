import {
  boolean,
  index,
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
  tier: providerTiers().notNull().default("specialists"),
  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNow("updated_at"),
});

export const models = pgTable(
  "models",
  {
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
    architectureOutputModalities: text(
      "architecture_output_modalities"
    ).array(),
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
    isFlagship: boolean("is_flagship").notNull().default(false),
    isCoder: boolean("is_coder").notNull().default(false),
    isArtist: boolean("is_artist").notNull().default(false),
    isChat: boolean("is_chat").notNull(),

    is_experimental: boolean("is_experimental"),
    is_premium: boolean("is_premium"),
    is_new: boolean("is_new"),
    is_included: boolean("is_included"),
    capability_fast: boolean("capability_fast"),
    capability_vision: boolean("capability_vision"),
    capability_pdf: boolean("capability_pdf"),
    capability_reasoning: boolean("capability_reasoning"),
    capability_image_generation: boolean("capability_image_generation"),
    capability_tools: boolean("capability_tools"),
    capability_effort_control: boolean("capability_effort_control"),

    updatedAt: timestampTzNow("updated_at"),
    deletedAt: timestampTz("deleted_at"),
  },
  (table) => [
    index("models_is_chat_deleted_at_idx").on(table.isChat, table.deletedAt),
  ]
);

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

export type ProviderTier = (typeof providerTiers.enumValues)[number];

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type SupportedParameter = typeof supportedParameters.$inferSelect;
export type NewSupportedParameter = typeof supportedParameters.$inferInsert;
