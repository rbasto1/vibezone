import { relations } from "drizzle-orm";
import { session, user } from "./auth-schema";
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
} from "./tables";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  chats: many(chats),
  usage: many(usage),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const modelsRelations = relations(models, ({ one, many }) => ({
  provider: one(providers, {
    fields: [models.providerId],
    references: [providers.id],
  }),
  supportedParameters: many(modelSupportedParameters),
  translations: many(modelTranslations),
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

export const chatRelations = relations(chats, ({ one, many }) => ({
  user: one(user, {
    fields: [chats.userId],
    references: [user.id],
  }),
  threads: many(threads),
}));

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

export const usageRelations = relations(usage, ({ one }) => ({
  user: one(user, {
    fields: [usage.userId],
    references: [user.id],
  }),
  model: one(models, {
    fields: [usage.modelId],
    references: [models.id],
  }),
}));

export const localesRelations = relations(locales, ({ many }) => ({
  modelTranslations: many(modelTranslations),
  suggestionGroupTranslations: many(suggestionGroupTranslations),
}));

export const modelTranslationsRelations = relations(
  modelTranslations,
  ({ one }) => ({
    model: one(models, {
      fields: [modelTranslations.modelId],
      references: [models.id],
    }),
    locale: one(locales, {
      fields: [modelTranslations.localeId],
      references: [locales.id],
    }),
  })
);

export const suggestionGroupsRelations = relations(
  suggestionGroups,
  ({ many }) => ({
    translations: many(suggestionGroupTranslations),
  })
);

export const suggestionGroupTranslationsRelations = relations(
  suggestionGroupTranslations,
  ({ one }) => ({
    suggestionGroup: one(suggestionGroups, {
      fields: [suggestionGroupTranslations.suggestionGroupId],
      references: [suggestionGroups.id],
    }),
    locale: one(locales, {
      fields: [suggestionGroupTranslations.localeId],
      references: [locales.id],
    }),
  })
);
