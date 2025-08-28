import "server-only";

import { db } from "@/db";
import type { Provider } from "@/db/schema";
import { models, providers } from "@/db/schema";
import { publicProcedure, t } from "@/lib/trpc/server/initialize";
import { eq } from "drizzle-orm";

export const modelsRouter = t.router({
  list: publicProcedure.query(async () => {
    const result = await db
      .select({
        model: models,
        provider: providers,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .orderBy(models.name);
    const uniqueProviders = result
      .map((item) => item.provider)
      .reduce((acc, provider) => {
        if (!acc.some((p) => p.id === provider.id)) {
          acc.push(provider);
        }
        return acc;
      }, [] as Provider[]);

    return {
      models: result.map((item) => ({
        ...item.model,
        provider: {
          name: item.provider.name,
        },
      })),
      providers: uniqueProviders,
    };
  }),
});
