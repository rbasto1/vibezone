import { relations } from "drizzle-orm";
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
const timestampTzNowUpdated = (name: string) =>
  timestampTz(name)
    .defaultNow()
    .notNull()
    .$onUpdate(() => /* @__PURE__ */ new Date());

import { account, session, user, verification } from "@/db/auth-schema";
export { account, session, user, verification };

export const providerTiers = pgEnum("provider_tier", [
  "leaders",
  "challengers",
  "specialists",
]);

export const providers = pgTable("providers", {
  id: text("id").primaryKey(), // openai, anthropic, gemini, etc.
  name: text("name").notNull(),
  tier: providerTiers().notNull().default("specialists"),
  order: integer("order"), // custom ordering for display
  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNowUpdated("updated_at"),
  deletedAt: timestampTz("deleted_at"),
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
    isChat: boolean("is_chat").notNull(), // we only show isChat models

    priority: integer("priority"), // the first 3 models that are loaded by default
    isFlagship: boolean("is_flagship").notNull().default(false), // initial suggestion box group
    isCoder: boolean("is_coder").notNull().default(false), // initial suggestion box group
    isArtist: boolean("is_artist").notNull().default(false), // initial suggestion box group

    isSuggested: boolean("is_suggested").notNull().default(false), // if false, appears under "see more..."

    isExperimental: boolean("is_experimental"),
    isPremium: boolean("is_premium"),
    isNew: boolean("is_new"),
    isIncluded: boolean("is_included"),
    capabilityFast: boolean("capability_fast"),
    capabilityEffortControl: boolean("capability_effort_control"),

    updatedAt: timestampTzNowUpdated("updated_at"),
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

export const modelsRelations = relations(models, ({ one, many }) => ({
  provider: one(providers, {
    fields: [models.providerId],
    references: [providers.id],
  }),
  supportedParameters: many(modelSupportedParameters),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  models: many(models),
}));

export const supportedParametersRelations = relations(
  supportedParameters,
  ({ many }) => ({
    modelSupportedParameters: many(modelSupportedParameters),
  })
);

export const modelSupportedParametersRelations = relations(
  modelSupportedParameters,
  ({ one }) => ({
    model: one(models, {
      fields: [modelSupportedParameters.modelId],
      references: [models.id],
    }),
    supportedParameter: one(supportedParameters, {
      fields: [modelSupportedParameters.supportedParameterId],
      references: [supportedParameters.id],
    }),
  })
);

export const threads = pgTable("threads", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  lastMessageAt: timestampTz("last_message_at").notNull(),
  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNowUpdated("updated_at"),
  deletedAt: timestampTz("deleted_at"),
});

export const threadsRelations = relations(threads, ({ one }) => ({
  user: one(user, {
    fields: [threads.userId],
    references: [user.id],
  }),
}));

export type ProviderTier = (typeof providerTiers.enumValues)[number];

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type SupportedParameter = typeof supportedParameters.$inferSelect;
export type NewSupportedParameter = typeof supportedParameters.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
