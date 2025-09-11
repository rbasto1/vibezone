import "server-only";

import { db } from "@/db";
import { models, user } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { MAX_PANELS } from "../constants";
import { authenticatedProcedure, t } from "./server/initialize";

export const usersRouter = t.router({
  // Replace lastModels with the exact array in the given order,
  // filtering out invalid/deleted/non-chat models
  setLastModels: authenticatedProcedure
    .input(z.object({ modelIds: z.array(z.string()).max(MAX_PANELS) }))
    .mutation(async ({ ctx, input }) => {
      const authUser = ctx.user!;

      if (!input.modelIds.length) {
        await db
          .update(user)
          .set({ lastModels: [] })
          .where(eq(user.id, authUser.id));
        return { ok: true as const, lastModels: [] as string[] };
      }

      const candidates = await db
        .select({ id: models.id })
        .from(models)
        .where(
          and(
            inArray(models.id, input.modelIds),
            isNull(models.deletedAt),
            eq(models.isChat, true)
          )
        );
      const valid = new Set(candidates.map((m) => m.id));
      const ordered = input.modelIds.filter((id) => valid.has(id)).slice(0, 3);

      await db
        .update(user)
        .set({ lastModels: ordered })
        .where(eq(user.id, authUser.id));

      return { ok: true as const, lastModels: ordered };
    }),
});
