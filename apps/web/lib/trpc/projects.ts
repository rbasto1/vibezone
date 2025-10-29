import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { chats, db, projects } from "@/db";
import { TRPCError } from "@trpc/server";
import { authenticatedProcedure, t } from "./server/initialize";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const projectInputSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(HEX_COLOR_REGEX, "Invalid color"),
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

      let insertedProjectId: string | null = null;

      try {
        const inserted = await db
          .insert(projects)
          .values({
            userId: user.id,
            name: input.name.trim(),
            color: input.color,
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
      z.object({
        id: z.string(),
        data: projectInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const target = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.id),
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

      const { name, color } = input.data;
      const updated = await db
        .update(projects)
        .set({
          name: name.trim(),
          color,
        })
        .where(eq(projects.id, input.id))
        .returning()
        .catch((error) => {
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
        });

      return updated;
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

      const chatRecordPromise = db.query.chats.findFirst({
        where: eq(chats.id, input.chatId),
        with: {
          project: {
            columns: { id: true, userId: true, deletedAt: true },
          },
        },
      });

      const targetProjectPromise = db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.targetProjectId),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt)
        ),
      });

      const [chatRecord, targetProject] = await Promise.all([
        chatRecordPromise,
        targetProjectPromise,
      ]);

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
        .set({ projectId: targetProject.id })
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

      const deletedAt = new Date();

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

        await db
          .update(chats)
          .set({ projectId: targetProject.id })
          .where(eq(chats.projectId, projectRecord.id));
      } else {
        await db
          .update(chats)
          .set({ deletedAt })
          .where(eq(chats.projectId, projectRecord.id));
      }

      await db
        .update(projects)
        .set({ deletedAt })
        .where(eq(projects.id, projectRecord.id));

      return { success: true as const };
    }),
});

async function selectProjects(userId: string, projectId?: string) {
  const rows = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      name: projects.name,
      color: projects.color,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      isDefault: sql<boolean>`${projects.id} = ${userId}`,
    })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
        projectId ? eq(projects.id, projectId) : sql`true`
      )
    )
    .orderBy(projects.name);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDefault: row.isDefault,
  }));
}

async function getProjectById(userId: string, projectId: string) {
  const projectsList = await selectProjects(userId, projectId);
  return projectsList[0] ?? null;
}
