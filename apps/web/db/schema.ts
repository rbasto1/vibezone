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
  dataRetention: boolean("data_retention").notNull().default(false),
  privacyPolicyUrl: text("privacy_policy_url"),
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
    // capabilityEffortControl: boolean("capability_effort_control"),
    // created from API (epoch seconds) -> timestamptz
    createdAt: timestampTzNow("created_at"),

    // VIBEZONE specific fields
    // UI selection priority for default panels
    isChat: boolean("is_chat").notNull(), // we only show isChat models

    priority: integer("priority"), // the first 3 models that are loaded by default

    isSuggested: boolean("is_suggested").notNull().default(false), // if false, appears under "see more..."

    isExperimental: boolean("is_experimental"),
    isPremium: boolean("is_premium"),
    isNew: boolean("is_new"),
    isIncluded: boolean("is_included"),
    isFree: boolean("is_free").notNull().default(false),

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

export const suggestionGroups = pgTable("suggestion_groups", {
  id: text("id").primaryKey(), // flagship, coder, roleplay, fast
  icon: text("icon").notNull(), // lucide icon name
  title: text("title").notNull(), // "Flagship Models", "Best Coders", etc.
  label: text("label").notNull(), // description text
  promoted: boolean("promoted").notNull().default(false), // whether to show prominently
  models: text("models").array().notNull(), // array of model IDs
  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNowUpdated("updated_at"),
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

export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  title: text("title").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  lastMessageAt: timestampTz("last_message_at").notNull(),
  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNowUpdated("updated_at"),
  deletedAt: timestampTz("deleted_at"),
});

export const chatRelations = relations(chats, ({ one, many }) => ({
  user: one(user, {
    fields: [chats.userId],
    references: [user.id],
  }),
  threads: many(threads),
}));

export const threads = pgTable("threads", {
  id: text("id").primaryKey(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id),
  lastModelId: text("last_model_id")
    .notNull()
    .references(() => models.id),
  lastMessageAt: timestampTz("last_message_at").notNull(),
  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNowUpdated("updated_at"),
  closedAt: timestampTz("closed_at"),
});

export const threadsRelations = relations(threads, ({ one, many }) => ({
  chat: one(chats, {
    fields: [threads.chatId],
    references: [chats.id],
  }),
  lastModel: one(models, {
    fields: [threads.lastModelId],
    references: [models.id],
  }),
  messages: many(messages),
}));

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => threads.id),
  modelId: text("last_model_id")
    .notNull()
    .references(() => models.id),
  role: text("role").notNull(), // "user" | "assistant"
  content: jsonb("content").notNull(), // Store the full content array
  attachments: jsonb("attachments"), // Store attachments array
  metadata: jsonb("metadata"), // Store metadata object
  status: jsonb("status"), // Store status object (for assistant messages)
  createdAt: timestampTz("created_at").notNull(),
  updatedAt: timestampTzNowUpdated("updated_at"),
  deletedAt: timestampTz("deleted_at"),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(threads, {
    fields: [messages.threadId],
    references: [threads.id],
  }),
  model: one(models, {
    fields: [messages.modelId],
    references: [models.id],
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
export type SuggestionGroup = typeof suggestionGroups.$inferSelect;
export type NewSuggestionGroup = typeof suggestionGroups.$inferInsert;
export type SupportedParameter = typeof supportedParameters.$inferSelect;
export type NewSupportedParameter = typeof supportedParameters.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
