import "server-only";

import { db } from "@/db";
import { instructions } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { authenticatedProcedure, t } from "./server/initialize";

const instructionInputSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
  projectId: z.string().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const instructionsRouter = t.router({
  list: authenticatedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) throw new Error("Assert: auth procedure must have user");

    const rows = await db
      .select({
        id: instructions.id,
        title: instructions.title,
        content: instructions.content,
        projectId: instructions.projectId,
        isActive: instructions.isActive,
        order: instructions.order,
      })
      .from(instructions)
      .where(
        and(eq(instructions.userId, user.id), isNull(instructions.deletedAt))
      )
      .orderBy(asc(instructions.order), asc(instructions.createdAt));

    return rows;
  }),

  create: authenticatedProcedure
    .input(instructionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const trimmedTitle = input.title.trim();
      const trimmedContent = input.content.trim();
      if (!trimmedTitle.length || !trimmedContent.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Title and content are required",
        });
      }

      const projectId = input.projectId ?? null;

      const [lastInstruction] = await db
        .select({ order: instructions.order })
        .from(instructions)
        .where(
          and(eq(instructions.userId, user.id), isNull(instructions.deletedAt))
        )
        .orderBy(desc(instructions.order))
        .limit(1);

      const nextOrder = (lastInstruction?.order ?? -1) + 1;

      const [created] = await db
        .insert(instructions)
        .values({
          userId: user.id,
          title: trimmedTitle,
          content: trimmedContent,
          projectId,
          isActive: input.isActive ?? true,
          order: nextOrder,
        })
        .returning({
          id: instructions.id,
          title: instructions.title,
          content: instructions.content,
          projectId: instructions.projectId,
          isActive: instructions.isActive,
          order: instructions.order,
        });

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create instruction",
        });
      }

      return created;
    }),

  update: authenticatedProcedure
    .input(
      instructionInputSchema.extend({
        id: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const existing = await db.query.instructions.findFirst({
        columns: { id: true, userId: true, isActive: true },
        where: and(
          eq(instructions.id, input.id),
          eq(instructions.userId, user.id),
          isNull(instructions.deletedAt)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instruction not found",
        });
      }

      const trimmedTitle = input.title.trim();
      const trimmedContent = input.content.trim();
      if (!trimmedTitle.length || !trimmedContent.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Title and content are required",
        });
      }

      const projectId = input.projectId ?? null;

      const [updated] = await db
        .update(instructions)
        .set({
          title: trimmedTitle,
          content: trimmedContent,
          projectId,
          isActive: input.isActive ?? existing.isActive,
        })
        .where(eq(instructions.id, input.id))
        .returning({
          id: instructions.id,
          title: instructions.title,
          content: instructions.content,
          projectId: instructions.projectId,
          isActive: instructions.isActive,
          order: instructions.order,
        });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update instruction",
        });
      }

      return updated;
    }),

  setActive: authenticatedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const [updated] = await db
        .update(instructions)
        .set({ isActive: input.isActive })
        .where(
          and(
            eq(instructions.id, input.id),
            eq(instructions.userId, user.id),
            isNull(instructions.deletedAt)
          )
        )
        .returning({
          id: instructions.id,
          title: instructions.title,
          content: instructions.content,
          projectId: instructions.projectId,
          isActive: instructions.isActive,
          order: instructions.order,
        });

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instruction not found",
        });
      }

      return updated;
    }),

  reorder: authenticatedProcedure
    .input(
      z.object({
        instructionIds: z.array(z.string().min(1)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      if (!input.instructionIds.length) {
        return { success: true } as const;
      }

      const existing = await db
        .select({ id: instructions.id })
        .from(instructions)
        .where(
          and(
            eq(instructions.userId, user.id),
            isNull(instructions.deletedAt),
            inArray(instructions.id, input.instructionIds)
          )
        );

      const validIds = new Set(existing.map((item) => item.id));
      const orderedIds = input.instructionIds.filter((id) => validIds.has(id));

      await db.transaction(async (tx) => {
        await Promise.all(
          orderedIds.map((id, index) =>
            tx
              .update(instructions)
              .set({ order: index })
              .where(eq(instructions.id, id))
          )
        );
      });

      return { success: true } as const;
    }),

  delete: authenticatedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const [updated] = await db
        .update(instructions)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(instructions.id, input.id),
            eq(instructions.userId, user.id),
            isNull(instructions.deletedAt)
          )
        )
        .returning({ id: instructions.id });

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instruction not found",
        });
      }

      return { success: true } as const;
    }),
});
