import "server-only";

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { chatsRouter } from "../chats";
import { instructionsRouter } from "../instructions";
import { localesRouter } from "../locales";
import { messagesRouter } from "../messages";
import { modelsRouter } from "../models";
import { newsRouter } from "../news";
import { projectsRouter } from "../projects";
import { providersRouter } from "../providers";
import { suggestionGroupsRouter } from "../suggestion-groups";
import { usersRouter } from "../users";
import { t } from "./initialize";

export const appRouter = t.router({
  chats: chatsRouter,
  messages: messagesRouter,
  models: modelsRouter,
  providers: providersRouter,
  suggestionGroups: suggestionGroupsRouter,
  users: usersRouter,
  locales: localesRouter,
  news: newsRouter,
  projects: projectsRouter,
  instructions: instructionsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// models
export type ModelsListOutput = RouterOutputs["models"]["list"];
export type ModelsAdminListOutput = RouterOutputs["models"]["adminList"];
export type ModelsSyncFromOpenRouterOutput =
  RouterOutputs["models"]["syncFromOpenRouter"];
// providers
export type ProvidersListOutput = RouterOutputs["providers"]["list"];
// suggestion groups
export type SuggestionGroupsListOutput =
  RouterOutputs["suggestionGroups"]["list"];
// locales
export type LocalesListOutput = RouterOutputs["locales"]["list"];
// users
export type UsersManageListOutput = RouterOutputs["users"]["manageList"];
// model translations
export type ModelTranslationDetailsOutput = RouterOutputs["models"]["details"];
export type AdminDescriptionsOutput =
  RouterOutputs["models"]["adminDescriptions"];
export type NewsAdminListOutput = RouterOutputs["news"]["list"];
