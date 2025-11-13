import { providerTiers } from "./enums";

import {
  chatRelations,
  dataExportsRelations,
  instructionsRelations,
  memoriesRelations,
  localesRelations,
  messageRatingsRelations,
  messagesRelations,
  modelsRelations,
  modelSupportedParametersRelations,
  modelTranslationsRelations,
  projectsRelations,
  providersRelations,
  suggestionGroupsRelations,
  suggestionGroupTranslationsRelations,
  supportedParametersRelations,
  threadsRelations,
  usageRelations,
  usersModelsRelations,
} from "./relations";

import {
  chats,
  instructions,
  memories,
  dataExports,
  locales,
  messageRatings,
  messages,
  models,
  modelSupportedParameters,
  modelTranslations,
  newsArticles,
  preferences,
  projects,
  providers,
  suggestionGroups,
  suggestionGroupTranslations,
  supportedParameters,
  threads,
  usage,
  usersModels,
  userStats,
} from "./tables";

export {
  chatRelations,
  chats,
  dataExports,
  dataExportsRelations,
  instructions,
  instructionsRelations,
  memories,
  memoriesRelations,
  locales,
  localesRelations,
  messageRatings,
  messageRatingsRelations,
  messages,
  messagesRelations,
  models,
  modelsRelations,
  modelSupportedParameters,
  modelSupportedParametersRelations,
  modelTranslations,
  modelTranslationsRelations,
  newsArticles,
  preferences,
  projects,
  projectsRelations,
  providers,
  providersRelations,
  providerTiers,
  suggestionGroups,
  suggestionGroupsRelations,
  suggestionGroupTranslations,
  suggestionGroupTranslationsRelations,
  supportedParameters,
  supportedParametersRelations,
  threads,
  threadsRelations,
  usage,
  usageRelations,
  usersModels,
  usersModelsRelations,
  userStats,
};

export type ProviderTier = (typeof providerTiers.enumValues)[number];
export type ReasoningEffort = "none" | "low" | "medium" | "high";

export type UserStats = typeof userStats.$inferSelect;
export type NewUserStats = typeof userStats.$inferInsert;
export type Preferences = typeof preferences.$inferSelect;
export type NewPreferences = typeof preferences.$inferInsert;
export type Instruction = typeof instructions.$inferSelect;
export type NewInstruction = typeof instructions.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type SuggestionGroup = typeof suggestionGroups.$inferSelect;
export type NewSuggestionGroup = typeof suggestionGroups.$inferInsert;
export type SuggestionGroupTranslation =
  typeof suggestionGroupTranslations.$inferSelect;
export type NewSuggestionGroupTranslation =
  typeof suggestionGroupTranslations.$inferInsert;
export type SupportedParameter = typeof supportedParameters.$inferSelect;
export type NewSupportedParameter = typeof supportedParameters.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type NewNewsArticle = typeof newsArticles.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageRating = typeof messageRatings.$inferSelect;
export type NewMessageRating = typeof messageRatings.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Usage = typeof usage.$inferSelect;
export type NewUsage = typeof usage.$inferInsert;
export type DataExport = typeof dataExports.$inferSelect;
export type NewDataExport = typeof dataExports.$inferInsert;
export type Locale = typeof locales.$inferSelect;
export type NewLocale = typeof locales.$inferInsert;
export type ModelTranslation = typeof modelTranslations.$inferSelect;
export type NewModelTranslation = typeof modelTranslations.$inferInsert;
export type UserModel = typeof usersModels.$inferSelect;
export type NewUserModel = typeof usersModels.$inferInsert;
