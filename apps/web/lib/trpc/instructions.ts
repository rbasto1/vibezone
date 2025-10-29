import "server-only";

import {
  db,
  instructions as instructionsTable,
  projects as projectsTable,
} from "@/db";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
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
        id: instructionsTable.id,
        title: instructionsTable.title,
        content: instructionsTable.content,
        projectId: instructionsTable.projectId,
        isActive: instructionsTable.isActive,
        order: instructionsTable.order,
      })
      .from(instructionsTable)
      .where(
        and(
          eq(instructionsTable.userId, user.id),
          isNull(instructionsTable.deletedAt)
        )
      )
      .orderBy(asc(instructionsTable.order), asc(instructionsTable.createdAt));

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
        .select({ order: instructionsTable.order })
        .from(instructionsTable)
        .where(
          and(
            eq(instructionsTable.userId, user.id),
            isNull(instructionsTable.deletedAt)
          )
        )
        .orderBy(desc(instructionsTable.order))
        .limit(1);

      const nextOrder = (lastInstruction?.order ?? -1) + 1;

      const project = projectId
        ? await db.query.projects.findFirst({
            columns: { id: true },
            where: and(
              eq(projectsTable.id, projectId),
              eq(projectsTable.userId, user.id)
            ),
          })
        : null;
      if (projectId && !project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const [created] = await db
        .insert(instructionsTable)
        .values({
          userId: user.id,
          title: trimmedTitle,
          content: trimmedContent,
          projectId,
          isActive: input.isActive ?? true,
          order: nextOrder,
        })
        .returning({
          id: instructionsTable.id,
          title: instructionsTable.title,
          content: instructionsTable.content,
          projectId: instructionsTable.projectId,
          isActive: instructionsTable.isActive,
          order: instructionsTable.order,
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
        columns: {
          id: true,
          userId: true,
          isActive: true,
          projectId: true,
        },
        where: and(
          eq(instructionsTable.id, input.id),
          eq(instructionsTable.userId, user.id),
          isNull(instructionsTable.deletedAt)
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
      if (projectId && projectId !== existing.projectId) {
        const project = await db.query.projects.findFirst({
          columns: { id: true },
          where: and(
            eq(projectsTable.id, projectId),
            eq(projectsTable.userId, user.id)
          ),
        });
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
      }

      const [updated] = await db
        .update(instructionsTable)
        .set({
          title: trimmedTitle,
          content: trimmedContent,
          projectId,
          isActive: input.isActive ?? existing.isActive,
        })
        .where(eq(instructionsTable.id, input.id))
        .returning({
          id: instructionsTable.id,
          title: instructionsTable.title,
          content: instructionsTable.content,
          projectId: instructionsTable.projectId,
          isActive: instructionsTable.isActive,
          order: instructionsTable.order,
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
        .update(instructionsTable)
        .set({ isActive: input.isActive })
        .where(
          and(
            eq(instructionsTable.id, input.id),
            eq(instructionsTable.userId, user.id),
            isNull(instructionsTable.deletedAt)
          )
        )
        .returning({
          id: instructionsTable.id,
          title: instructionsTable.title,
          content: instructionsTable.content,
          projectId: instructionsTable.projectId,
          isActive: instructionsTable.isActive,
          order: instructionsTable.order,
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
        .select({ id: instructionsTable.id })
        .from(instructionsTable)
        .where(
          and(
            eq(instructionsTable.userId, user.id),
            isNull(instructionsTable.deletedAt),
            inArray(instructionsTable.id, input.instructionIds)
          )
        );

      const validIds = new Set(existing.map((item) => item.id));
      const orderedIds = input.instructionIds.filter((id) => validIds.has(id));

      // We fake an insert to be able to update many rows at once with onConflicDoUpdate
      await db
        .insert(instructionsTable)
        .values(
          orderedIds.map((id, index) => ({
            id,
            order: index,
            userId: user.id,
            title: "",
            content: "",
          }))
        )
        .onConflictDoUpdate({
          target: instructionsTable.id,
          set: {
            order: sql`EXCLUDED.order`,
          },
        });

      return { success: true } as const;
    }),

  delete: authenticatedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const [updated] = await db
        .update(instructionsTable)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(instructionsTable.id, input.id),
            eq(instructionsTable.userId, user.id),
            isNull(instructionsTable.deletedAt)
          )
        )
        .returning({ id: instructionsTable.id });

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instruction not found",
        });
      }

      return { success: true } as const;
    }),
});
