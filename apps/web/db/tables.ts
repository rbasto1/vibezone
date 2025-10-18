import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { providerTiers } from "./enums";
import { timestampTz, timestampTzNow, timestampTzNowUpdated } from "./helpers";
import type {
  MessageMetadata,
  MessageRate,
  MessageRatingAttachment,
  MessageStatus,
  ModelPricing,
  ModelTopProvider,
} from "./json-columns-types";

export const userStats = pgTable("user_stats", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  imageUrl: text("image_url"),

  createdAt: timestampTz("created_at").notNull(),
  lastSignInAt: timestampTz("last_sign_in_at"),
  lastActiveAt: timestampTz("last_active_at"),
  lastUpdatedAt: timestampTzNowUpdated("last_updated_at"),
});

export const preferences = pgTable("preferences", {
  userId: text("user_id").primaryKey(),

  // User preferences
  lastModels: text("last_models").array(),
  favoriteModels: text("favorite_models").array(),
  preferenceAutoScroll: boolean("preference_auto_scroll")
    .default(false)
    .notNull(),
  preferenceHiddenProviders: text("preference_hidden_providers").array(),
  preferenceSystemPrompt: text("preference_system_prompt"),
  preferenceSystemPromptChangedAt: timestampTz(
    "preference_system_prompt_changed_at"
  ),
  preferenceWebSearch: boolean("preference_web_search").default(true).notNull(),
  preferenceReasoningEffort: text("preference_reasoning_effort")
    .default("low")
    .notNull(),
  preferenceSkipCloseThreadConfirmation: boolean(
    "preference_skip_close_thread_confirmation"
  )
    .default(false)
    .notNull(),
  lastNewsSeenAt: timestampTz("last_news_seen_at"),

  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNowUpdated("updated_at"),
});

export const newsArticles = pgTable("news_articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: jsonb("title").notNull().$type<Record<string, string>>(),
  body: jsonb("body").notNull().$type<Record<string, string>>(),
  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNowUpdated("updated_at"),
  deletedAt: timestampTz("deleted_at"),
});

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
    canonicalSlug: text("canonical_slug").notNull(),
    huggingFaceId: text("hugging_face_id"),
    description: text("description").notNull(),
    // flattened architecture fields
    architectureModality: text("architecture_modality").notNull(),
    architectureInputModalities: text("architecture_input_modalities")
      .array()
      .notNull(),
    architectureOutputModalities: text("architecture_output_modalities")
      .array()
      .notNull(),
    architectureTokenizer: text("architecture_tokenizer").notNull(),
    architectureInstructType: text("architecture_instruct_type"),
    // keep pricing and top_provider as JSONB
    pricing: jsonb("pricing").notNull().$type<ModelPricing>(),
    topProvider: jsonb("top_provider").notNull().$type<ModelTopProvider>(),
    perRequestLimits: jsonb("per_request_limits").$type<null>(),
    // created_at is now timestamped when we import the model
    createdAt: timestampTzNow("created_at"),
    // api_created_at stores the original created timestamp from the API (epoch seconds) -> timestamptz
    apiCreatedAt: timestampTz("api_created_at"),

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

    hiddenAt: timestampTz("hidden_at"),
    updatedAt: timestampTzNowUpdated("updated_at"),
    deletedAt: timestampTz("deleted_at"),
  },
  (table) => [
    index("models_is_chat_deleted_at_idx").on(table.isChat, table.deletedAt),
  ]
);

export const locales = pgTable("locales", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  available: boolean("available").notNull().default(false),
  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNowUpdated("updated_at"),
});

export const modelTranslations = pgTable(
  "model_translations",
  {
    modelId: text("model_id")
      .notNull()
      .references(() => models.id),
    localeId: text("locale_id")
      .notNull()
      .references(() => locales.id),
    description: text("description"),
    createdAt: timestampTzNow("created_at"),
    updatedAt: timestampTzNowUpdated("updated_at"),
    manuallyEditedAt: timestampTz("manually_edited_at"),
  },
  (table) => [primaryKey({ columns: [table.modelId, table.localeId] })]
);

export const supportedParameters = pgTable("supported_parameters", {
  // same as OpenRouter parameter id, e.g. "reasoning", "seed"
  id: text("id").primaryKey(),
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
  order: integer("order"), // display ordering for groups
  promoted: boolean("promoted").notNull().default(false), // whether to show prominently
  models: text("models").array().notNull(), // array of model IDs
  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNowUpdated("updated_at"),
});

export const suggestionGroupTranslations = pgTable(
  "suggestion_group_translations",
  {
    suggestionGroupId: text("suggestion_group_id")
      .notNull()
      .references(() => suggestionGroups.id),
    localeId: text("locale_id")
      .notNull()
      .references(() => locales.id),
    title: text("title").notNull(),
    label: text("label").notNull(),
    createdAt: timestampTzNow("created_at"),
    updatedAt: timestampTzNowUpdated("updated_at"),
  },
  (table) => [
    primaryKey({ columns: [table.suggestionGroupId, table.localeId] }),
  ]
);

export const modelSupportedParameters = pgTable(
  "model_supported_parameters",
  {
    modelId: text("model_id")
      .notNull()
      .references(() => models.id),
    supportedParameterId: text("supported_parameter_id")
      .notNull()
      .references(() => supportedParameters.id),
  },
  (table) => [
    primaryKey({ columns: [table.modelId, table.supportedParameterId] }),
  ]
);

export const usersModels = pgTable(
  "users_models",
  {
    userId: text("user_id").notNull(),
    modelId: text("model_id")
      .notNull()
      .references(() => models.id),
    favoritedAt: timestampTz("favorited_at"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.modelId] })]
);

export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  lastMessageAt: timestampTz("last_message_at").notNull(),
  createdAt: timestampTzNow("created_at"),
  updatedAt: timestampTzNowUpdated("updated_at"),
  deletedAt: timestampTz("deleted_at"),
});

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
  metadata: jsonb("metadata").$type<MessageMetadata>(), // Store metadata object
  status: jsonb("status").$type<MessageStatus>(), // Store status object (for assistant messages)
  createdAt: timestampTz("created_at").notNull(),
  updatedAt: timestampTzNowUpdated("updated_at"),
  deletedAt: timestampTz("deleted_at"),
});

export const messageRatings = pgTable(
  "message_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: text("message_id").references(() => messages.id),
    prompt: text("prompt").notNull(),
    response: text("response").notNull(),
    rate: text("rate").$type<MessageRate>().notNull(),
    attachments: jsonb("attachments")
      .$type<MessageRatingAttachment[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestampTzNow("created_at"),
    updatedAt: timestampTzNowUpdated("updated_at"),
  },
  (table) => [
    uniqueIndex("message_ratings_message_id_unique").on(table.messageId),
  ]
);

export const usage = pgTable(
  "usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id"),
    userKey: text("user_key"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    cfRay: text("cf_ray"),
    geo: jsonb("geo"),
    modelId: text("model_id").references(() => models.id),
    providerMetadata: jsonb("provider_metadata"),
    tokensPrompt: integer("tokens_prompt"),
    tokensCompletion: integer("tokens_completion"),
    costPrompt: numeric("cost_prompt"),
    costCompletion: numeric("cost_completion"),
    responseStatus: text("response_status"),
    createdAt: timestampTzNow("created_at"),
  },
  (table) => [
    index("usage_user_id_idx").on(table.userId, table.createdAt),
    index("usage_user_key_idx").on(table.userKey, table.createdAt),
    index("usage_model_id_idx").on(table.modelId, table.createdAt),
    index("usage_created_at_idx").on(table.createdAt),
  ]
);
