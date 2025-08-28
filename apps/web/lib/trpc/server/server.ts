import "server-only";

import { modelsRouter } from "../models";
import { t } from "./initialize";

export const appRouter = t.router({
  models: modelsRouter,
});

export type AppRouter = typeof appRouter;
