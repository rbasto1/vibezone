import "server-only";

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { modelsRouter } from "../models";
import { providersRouter } from "../providers";
import { usersRouter } from "../users";
import { t } from "./initialize";

export const appRouter = t.router({
  models: modelsRouter,
  providers: providersRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// models
export type ModelsListOutput = RouterOutputs["models"]["list"];
export type ModelsSyncFromOpenRouterOutput =
  RouterOutputs["models"]["syncFromOpenRouter"];
// providers
export type ProvidersListOutput = RouterOutputs["providers"]["list"];
