import "server-only";

import { db } from "@/db";
import { chats, projects } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { authenticatedProcedure, t } from "./server/initialize";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const projectInputSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().regex(HEX_COLOR_REGEX, "Invalid color"),
  instructions: z.string().max(20000).optional().nullable(),
});

export const projectsRouter = t.router({
  list: authenticatedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) throw new Error("Assert: auth procedure must have user");

    const rows = await selectProjects(user.id);
    return rows;
  }),

  create: authenticatedProcedure
    .input(projectInputSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const now = new Date();
      const trimmedInstructions =
        input.instructions?.trim().length === 0
          ? null
          : (input.instructions?.trim() ?? null);

      let insertedProjectId: string | null = null;

      try {
        const inserted = await db
          .insert(projects)
          .values({
            userId: user.id,
            name: input.name.trim(),
            color: input.color,
            instructions: trimmedInstructions,
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: projects.id });

        insertedProjectId = inserted[0]?.id ?? null;
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code?: string }).code === "23505"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A project with this name already exists",
          });
        }

        console.error("Failed to create project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
        });
      }

      if (!insertedProjectId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
        });
      }

      const project = await getProjectById(user.id, insertedProjectId);
      if (!project) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to load project",
        });
      }

      return project;
    }),

  update: authenticatedProcedure
    .input(
      projectInputSchema.extend({
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const target = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt)
        ),
      });

      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const trimmedInstructions =
        input.instructions?.trim().length === 0
          ? null
          : (input.instructions?.trim() ?? null);

      try {
        await db
          .update(projects)
          .set({
            name: input.name.trim(),
            color: input.color,
            instructions: trimmedInstructions,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, input.projectId));
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code?: string }).code === "23505"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A project with this name already exists",
          });
        }
        console.error("Failed to update project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update project",
        });
      }

      const project = await getProjectById(user.id, input.projectId);
      if (!project) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to load project",
        });
      }

      return project;
    }),

  moveChat: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
        targetProjectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const chatRecord = await db.query.chats.findFirst({
        where: eq(chats.id, input.chatId),
        with: {
          project: {
            columns: { id: true, userId: true, deletedAt: true },
          },
        },
      });

      if (
        !chatRecord ||
        !chatRecord.project ||
        chatRecord.project.userId !== user.id ||
        chatRecord.project.deletedAt
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      const targetProject = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.targetProjectId),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt)
        ),
      });

      if (!targetProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target project not found",
        });
      }

      if (chatRecord.projectId === targetProject.id) {
        return { success: true as const, chatId: chatRecord.id };
      }

      await db
        .update(chats)
        .set({
          projectId: targetProject.id,
          updatedAt: new Date(),
        })
        .where(eq(chats.id, input.chatId));

      return { success: true as const, chatId: chatRecord.id };
    }),

  delete: authenticatedProcedure
    .input(
      z.object({
        projectId: z.string(),
        strategy: z.enum(["move", "delete"]),
        targetProjectId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const projectRecord = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt)
        ),
      });

      if (!projectRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      if (projectRecord.id === user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Default project cannot be deleted",
        });
      }

      const now = new Date();

      await db.transaction(async (tx) => {
        if (input.strategy === "move") {
          if (!input.targetProjectId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Target project is required",
            });
          }

          if (input.targetProjectId === projectRecord.id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Target project must be different",
            });
          }

          const targetProject = await tx.query.projects.findFirst({
            where: and(
              eq(projects.id, input.targetProjectId),
              eq(projects.userId, user.id),
              isNull(projects.deletedAt)
            ),
          });

          if (!targetProject) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Target project not found",
            });
          }

          await tx
            .update(chats)
            .set({
              projectId: targetProject.id,
              updatedAt: now,
            })
            .where(eq(chats.projectId, projectRecord.id));
        } else {
          await tx
            .update(chats)
            .set({
              deletedAt: now,
              updatedAt: now,
            })
            .where(eq(chats.projectId, projectRecord.id));
        }

        await tx
          .update(projects)
          .set({
            deletedAt: now,
            updatedAt: now,
          })
          .where(eq(projects.id, projectRecord.id));
      });

      return { success: true as const };
    }),
});

async function selectProjects(userId: string, projectId?: string) {
  const chatCountField = sql<number>`count(${chats.id})::int`.as("chatCount");

  const rows = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      name: projects.name,
      color: projects.color,
      instructions: projects.instructions,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      isDefault: sql<boolean>`${projects.id} = ${userId}`,
      chatCount: chatCountField,
    })
    .from(projects)
    .leftJoin(
      chats,
      and(
        eq(chats.projectId, projects.id),
        isNull(chats.deletedAt),
        eq(chats.isArchived, false)
      )
    )
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
        projectId ? eq(projects.id, projectId) : sql`true`
      )
    )
    .groupBy(
      projects.id,
      projects.userId,
      projects.name,
      projects.color,
      projects.instructions,
      projects.createdAt,
      projects.updatedAt
    )
    .orderBy(asc(projects.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    instructions: row.instructions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    chatCount: row.chatCount ?? 0,
    isDefault: row.isDefault,
  }));
}

async function getProjectById(userId: string, projectId: string) {
  const projectsList = await selectProjects(userId, projectId);
  return projectsList[0] ?? null;
}
