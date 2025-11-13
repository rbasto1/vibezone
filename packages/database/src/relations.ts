import { relations } from "drizzle-orm";
import {
  chats,
  dataExports,
  instructions,
  locales,
  memories,
  messageRatings,
  messages,
  models,
  modelSupportedParameters,
  modelTranslations,
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
  project: one(projects, {
    fields: [chats.projectId],
    references: [projects.id],
  }),
  threads: many(threads),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(userStats, {
    fields: [projects.userId],
    references: [userStats.id],
  }),
  chats: many(chats),
  instructions: many(instructions),
  memories: many(memories),
}));

export const instructionsRelations = relations(instructions, ({ one }) => ({
  user: one(userStats, {
    fields: [instructions.userId],
    references: [userStats.id],
  }),
  project: one(projects, {
    fields: [instructions.projectId],
    references: [projects.id],
  }),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  user: one(userStats, {
    fields: [memories.userId],
    references: [userStats.id],
  }),
  project: one(projects, {
    fields: [memories.projectId],
    references: [projects.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ many, one }) => ({
  projects: many(projects),
  instructions: many(instructions),
  memories: many(memories),
  preferences: one(preferences, {
    fields: [userStats.id],
    references: [preferences.userId],
  }),
}));

export const preferencesRelations = relations(preferences, ({ one }) => ({
  user: one(userStats, {
    fields: [preferences.userId],
    references: [userStats.id],
  }),
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

export const messagesRelations = relations(messages, ({ one, many }) => ({
  thread: one(threads, {
    fields: [messages.threadId],
    references: [threads.id],
  }),
  model: one(models, {
    fields: [messages.modelId],
    references: [models.id],
  }),
  ratings: many(messageRatings),
}));

export const messageRatingsRelations = relations(messageRatings, ({ one }) => ({
  message: one(messages, {
    fields: [messageRatings.messageId],
    references: [messages.id],
  }),
}));

export const usageRelations = relations(usage, ({ one }) => ({
  model: one(models, {
    fields: [usage.modelId],
    references: [models.id],
  }),
}));

export const usersModelsRelations = relations(usersModels, ({ one }) => ({
  model: one(models, {
    fields: [usersModels.modelId],
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

export const dataExportsRelations = relations(dataExports, ({ one }) => ({
  user: one(userStats, {
    fields: [dataExports.userId],
    references: [userStats.id],
  }),
}));
