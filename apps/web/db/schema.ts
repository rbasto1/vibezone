import { providerTiers } from "@/db/enums";

import { account, session, user, verification } from "@/db/auth-schema";

import {
  chatRelations,
  localesRelations,
  messagesRelations,
  modelsRelations,
  modelSupportedParametersRelations,
  modelTranslationsRelations,
  providersRelations,
  sessionRelations,
  suggestionGroupsRelations,
  suggestionGroupTranslationsRelations,
  supportedParametersRelations,
  threadsRelations,
  usageRelations,
  userRelations,
} from "@/db/relations";

import {
  chats,
  locales,
  messages,
  models,
  modelSupportedParameters,
  modelTranslations,
  providers,
  suggestionGroups,
  suggestionGroupTranslations,
  supportedParameters,
  threads,
  usage,
} from "@/db/tables";

export {
  account,
  chatRelations,
  chats,
  locales,
  localesRelations,
  messages,
  messagesRelations,
  models,
  modelsRelations,
  modelSupportedParameters,
  modelSupportedParametersRelations,
  modelTranslations,
  modelTranslationsRelations,
  providers,
  providersRelations,
  providerTiers,
  session,
  sessionRelations,
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
  user,
  userRelations,
  verification,
};

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
export type SuggestionGroupTranslation =
  typeof suggestionGroupTranslations.$inferSelect;
export type NewSuggestionGroupTranslation =
  typeof suggestionGroupTranslations.$inferInsert;
export type SupportedParameter = typeof supportedParameters.$inferSelect;
export type NewSupportedParameter = typeof supportedParameters.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Usage = typeof usage.$inferSelect;
export type NewUsage = typeof usage.$inferInsert;
export type Locale = typeof locales.$inferSelect;
export type NewLocale = typeof locales.$inferInsert;
export type ModelTranslation = typeof modelTranslations.$inferSelect;
export type NewModelTranslation = typeof modelTranslations.$inferInsert;
