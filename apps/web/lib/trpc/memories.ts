import "server-only";

import {
  db,
  memories as memoriesTable,
  messages as messagesTable,
  projects as projectsTable,
  threads as threadsTable,
} from "@/db";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, lte, ne } from "drizzle-orm";
import { z } from "zod";

import { createMemoryEmbedding } from "./memory-embeddings";
import { generateMemoryPreview } from "./memory-worker";
import { authenticatedProcedure, t } from "./server/initialize";

const memoryScopeSchema = z.enum(["prompt", "response", "chat"]);

const baseMemorySelect = {
  id: memoriesTable.id,
  title: memoriesTable.title,
  content: memoriesTable.content,
  projectId: memoriesTable.projectId,
  isActive: memoriesTable.isActive,
  createdAt: memoriesTable.createdAt,
};

export const memoriesRouter = t.router({
  list: authenticatedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) throw new Error("Assert: auth procedure must have user");

    const rows = await db
      .select(baseMemorySelect)
      .from(memoriesTable)
      .where(
        and(eq(memoriesTable.userId, user.id), isNull(memoriesTable.deletedAt))
      )
      .orderBy(desc(memoriesTable.createdAt));

    return rows;
  }),

  create: authenticatedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(5000),
        projectId: z.string().min(1),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const project = await db.query.projects.findFirst({
        where: and(
          eq(projectsTable.id, input.projectId),
          eq(projectsTable.userId, user.id),
          isNull(projectsTable.deletedAt)
        ),
        columns: {
          id: true,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const title = input.title.trim();
      const content = input.content.trim();
      const embedding = await createMemoryEmbedding(title, content);

      const [created] = await db
        .insert(memoriesTable)
        .values({
          userId: user.id,
          projectId: input.projectId,
          title,
          content,
          embedding,
          isActive: input.isActive ?? true,
        })
        .returning(baseMemorySelect);

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create memory",
        });
      }

      return created;
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
        .update(memoriesTable)
        .set({ isActive: input.isActive })
        .where(
          and(
            eq(memoriesTable.id, input.id),
            eq(memoriesTable.userId, user.id),
            isNull(memoriesTable.deletedAt)
          )
        )
        .returning(baseMemorySelect);

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Memory not found",
        });
      }

      return updated;
    }),

  delete: authenticatedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const [deleted] = await db
        .update(memoriesTable)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(memoriesTable.id, input.id),
            eq(memoriesTable.userId, user.id),
            isNull(memoriesTable.deletedAt)
          )
        )
        .returning({ id: memoriesTable.id });

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Memory not found",
        });
      }

      return { success: true } as const;
    }),

  copyToProject: authenticatedProcedure
    .input(
      z.object({
        memoryId: z.string().min(1),
        targetProjectId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const memory = await db.query.memories.findFirst({
        where: and(
          eq(memoriesTable.id, input.memoryId),
          eq(memoriesTable.userId, user.id),
          isNull(memoriesTable.deletedAt)
        ),
      });
      if (!memory) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Memory not found",
        });
      }

      const project = await db.query.projects.findFirst({
        where: and(
          eq(projectsTable.id, input.targetProjectId),
          eq(projectsTable.userId, user.id),
          isNull(projectsTable.deletedAt)
        ),
        columns: { id: true },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const [copied] = await db
        .insert(memoriesTable)
        .values({
          userId: user.id,
          projectId: input.targetProjectId,
          title: memory.title,
          content: memory.content,
          embedding: memory.embedding,
          isActive: memory.isActive,
        })
        .returning(baseMemorySelect);

      if (!copied) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to copy memory",
        });
      }

      return copied;
    }),

  preview: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string().min(1),
        messageId: z.string().min(1),
        scope: memoryScopeSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const baseMessage = await db.query.messages
        .findFirst({
          where: eq(messagesTable.id, input.messageId),
          columns: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
            threadId: true,
          },
          with: {
            thread: {
              columns: {
                chatId: true,
                id: true,
              },
              with: {
                chat: {
                  with: {
                    project: {
                      columns: {
                        userId: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
        .then((message) => message);

      if (!baseMessage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      const thread = baseMessage.thread;
      if (thread.chat.project?.userId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }
      if (thread.chatId !== input.chatId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Message is not in the chat",
        });
      }

      if (
        baseMessage.role !== "assistant" &&
        baseMessage.role !== "user" &&
        baseMessage.role !== "system"
      ) {
        // assertion
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Only assistant, user, and system messages can be used for this scope",
        });
      }

      const source = await resolveMemorySourceText({
        scope: input.scope,
        baseMessage: {
          ...baseMessage,
          role: baseMessage.role,
        },
      });

      const preview = await generateMemoryPreview({
        text: source.text,
        projectName: baseMessage.thread.chat.project.name,
      });
      if (!preview) return null;

      return {
        title: preview.title,
        content: preview.content,
        projectId: source.projectId,
      };
    }),
});

async function resolveMemorySourceText({
  scope,
  baseMessage,
}: {
  scope: z.infer<typeof memoryScopeSchema>;
  baseMessage: {
    role: "user" | "assistant" | "system";
    content: unknown;
    createdAt: Date;
    threadId: string;
    thread: {
      chatId: string;
      chat: {
        projectId: string;
      };
    };
  };
}) {
  const projectId = baseMessage.thread.chat.projectId;
  const chatId = baseMessage.thread.chatId;

  switch (scope) {
    case "response": {
      if (baseMessage.role !== "assistant") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only assistant messages can be used for this scope",
        });
      }
      const responseText = extractTextFromContent(baseMessage.content);
      if (!responseText.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No assistant response to summarize",
        });
      }
      return { text: responseText, projectId };
    }

    case "prompt": {
      const prompt = await db.query.messages.findFirst({
        where: and(
          eq(messagesTable.threadId, baseMessage.threadId),
          eq(messagesTable.role, "user"),
          lte(messagesTable.createdAt, baseMessage.createdAt),
          isNull(messagesTable.deletedAt)
        ),
        orderBy: [desc(messagesTable.createdAt)],
        columns: {
          content: true,
        },
      });
      if (!prompt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No matching user prompt found",
        });
      }
      const promptText = extractTextFromContent(prompt?.content);
      if (!promptText.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No user prompt to summarize",
        });
      }

      return { text: promptText, projectId };
    }
    case "chat": {
      const transcriptRows = await db
        .select({
          role: messagesTable.role,
          content: messagesTable.content,
          createdAt: messagesTable.createdAt,
        })
        .from(messagesTable)
        .innerJoin(threadsTable, eq(threadsTable.id, messagesTable.threadId))
        .where(
          and(eq(threadsTable.chatId, chatId), ne(messagesTable.role, "system"))
        )
        .orderBy(asc(messagesTable.createdAt))
        .limit(200);

      const transcript = transcriptRows
        .map((row) => {
          const plain = extractTextFromContent(row.content);
          if (!plain.length) return null;
          const label =
            row.role === "assistant"
              ? "Assistant"
              : row.role === "system"
                ? "System"
                : "User";
          return `${label}: ${plain}`;
        })
        .filter((line): line is string => Boolean(line))
        .join("\n");

      if (!transcript.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Chat does not have any text to summarize",
        });
      }

      return { text: transcript, projectId };
    }
  }
}

const extractTextFromContent = (content: unknown): string => {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (!part || typeof part !== "object" || !("type" in part)) {
        return "";
      }
      const type = (part as { type?: unknown }).type ?? "";
      if (type === "text" || type === "reasoning") {
        const textValue = (part as { text?: unknown }).text;
        return typeof textValue === "string" ? textValue : "";
      }
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
};
