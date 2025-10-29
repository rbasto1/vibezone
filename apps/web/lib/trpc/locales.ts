import "server-only";

import { db, locales } from "@/db";
import { adminProcedure, t } from "@/lib/trpc/server/initialize";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { deepl, localeToTargetLanguageCode } from "../deepl/deepl";

export async function getLocalesList() {
  return await db.select().from(locales).orderBy(locales.id);
}

export const localesRouter = t.router({
  list: adminProcedure.query(() => getLocalesList()),

  create: adminProcedure
    .input(
      z.object({
        id: z.string().nonempty().max(5),
        name: z.string().nonempty().max(30),
        available: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      await db.insert(locales).values({
        id: input.id,
        name: input.name,
        available: input.available,
      });
      return { ok: true } as const;
    }),

  update: adminProcedure
    .input(
      z
        .object({
          id: z.string().nonempty(),
          name: z.string().nonempty().max(100).optional(),
          available: z.boolean().optional(),
        })
        .refine(
          (v) =>
            typeof v.name !== "undefined" || typeof v.available !== "undefined",
          {
            message: "At least one of name or available must be provided",
            path: ["name"],
          }
        )
    )
    .mutation(async ({ input }) => {
      const updates: Record<string, unknown> = {};

      if (typeof input.name !== "undefined") updates.name = input.name;
      if (typeof input.available !== "undefined")
        updates.available = input.available;

      await db.update(locales).set(updates).where(eq(locales.id, input.id));

      return { ok: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().nonempty() }))
    .mutation(async ({ input }) => {
      await db.delete(locales).where(eq(locales.id, input.id));
      return { ok: true } as const;
    }),

  translate: adminProcedure
    .input(
      z.object({
        text: z.string().nonempty().array().min(1),
        locale: z.string().nonempty(),
      })
    )
    .mutation(async ({ input }) => {
      const targetLanguage = localeToTargetLanguageCode(input.locale);
      const result = await deepl.translateText(
        input.text,
        "en",
        targetLanguage
      );
      return { translated: result.map((i) => i.text) } as const;
    }),
});

// Export types
export type LocalesRouter = typeof localesRouter;
