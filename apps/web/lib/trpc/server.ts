import { initTRPC } from "@trpc/server";
import "server-only";
import { z } from "zod";

import {
  getAllModels,
  getAllProviders,
  getIncludedModels,
  getModelById,
  getModelsByProvider,
  getModelsWithCapability,
  getModelsWithProviders,
  getPremiumModels,
  getProviderById,
} from "@/db/queries";

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = t.router({
  providers: t.router({
    getAll: publicProcedure.query(async () => {
      return await getAllProviders();
    }),
    getById: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await getProviderById(input);
    }),
  }),
  models: t.router({
    getAll: publicProcedure.query(async () => {
      return await getAllModels();
    }),
    getById: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await getModelById(input);
    }),
    getByProvider: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return await getModelsByProvider(input);
      }),
    getIncluded: publicProcedure.query(async () => {
      return await getIncludedModels();
    }),
    getPremium: publicProcedure.query(async () => {
      return await getPremiumModels();
    }),
    getWithCapability: publicProcedure
      .input(
        z.enum([
          "capabilityFast",
          "capabilityVision",
          "capabilityPdf",
          "capabilityReasoning",
          "capabilityImageGeneration",
          "capabilityTools",
          "capabilityEffortControl",
        ])
      )
      .query(async ({ input }) => {
        return await getModelsWithCapability(input);
      }),
    getWithProviders: publicProcedure.query(async () => {
      return await getModelsWithProviders();
    }),
  }),
});

export type AppRouter = typeof appRouter;
