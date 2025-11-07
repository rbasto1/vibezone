import type { Chat, Project, Thread } from "@/db";
import { chats, db, messages, projects, threads } from "@/db";
import { generateChatId } from "@/lib/id";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { CHAT_LIST_PAGE_SIZE, INTERNAL_SECRET } from "../constants";
import { searchChats } from "./chats-search";
import {
  authenticatedProcedure,
  publicProcedure,
  t,
} from "./server/initialize";

type ThreadWithChatProject = Pick<
  Thread,
  "id" | "lastMessageAt" | "lastModelId"
> & {
  chat:
    | (Pick<Chat, "id" | "projectId" | "title"> & {
        project?: Pick<Project, "id" | "userId"> | null;
      })
    | null;
};

export const chatsRouter = t.router({
  listChats: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        projectId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) {
        return {
          chats: [],
          next: null,
        };
      }
      return listChats({
        userId: user.id,
        cursor: input.cursor,
        limit: input.limit,
        projectId: input.projectId,
      });
    }),
  searchChats: authenticatedProcedure
    .input(
      z.object({
        query: z.string().min(2),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(CHAT_LIST_PAGE_SIZE),
        projectId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");
      return searchChats({
        userId: user.id,
        query: input.query,
        cursor: input.cursor,
        limit: input.limit,
        projectId: input.projectId,
      });
    }),

  renameChat: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
        projectId: z.string(),
        title: z.string().nullable(),
        firstUserMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { chatId, projectId, title: inputTitle, firstUserMessage } = input;
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");
      const userId = user.id;

      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
        with: {
          project: {
            columns: { id: true, userId: true, deletedAt: true },
          },
        },
      });
      if (chat && chat.project?.userId !== userId) {
        return { success: false, message: "Access denied" } as const;
      }

      const title = inputTitle ?? (await getChatName(chatId, firstUserMessage));

      if (chat) {
        await db
          .update(chats)
          .set({
            title,
          })
          .where(eq(chats.id, chatId));
      } else {
        const project = await db.query.projects.findFirst({
          columns: { id: true },
          where: and(
            eq(projects.id, projectId),
            eq(projects.userId, userId),
            isNull(projects.deletedAt)
          ),
        });

        if (!project) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Project not found",
          });
        }

        await db
          .insert(chats)
          .values({
            id: chatId,
            projectId,
            title,
            lastMessageAt: new Date(),
          })
          .onConflictDoUpdate({
            target: chats.id,
            set: { title },
          });
      }

      return { success: true, title } as const;
    }),

  getChatWithThreads: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { chatId } = input;
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      // Get the chat
      const chatRecord = await db.query.chats.findFirst({
        columns: {
          createdAt: false,
          updatedAt: false,
          deletedAt: false,
        },
        where: and(
          eq(chats.id, chatId),
          isNull(chats.deletedAt),
          isNull(projects.deletedAt)
        ),
        with: {
          project: {
            columns: {
              id: true,
              userId: true,
              name: true,
              color: true,
            },
          },
          threads: {
            with: {
              messages: {
                columns: {
                  createdAt: false,
                  updatedAt: false,
                  deletedAt: false,
                },
                orderBy: [asc(messages.createdAt)],
              },
            },
            orderBy: [asc(threads.id)],
          },
        },
      });

      if (!chatRecord?.project || chatRecord.project.userId !== user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      return chatRecord;
    }),

  deleteChat: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { chatId } = input;
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");
      const userId = user.id;

      const chatRecord = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
        with: {
          project: {
            columns: { userId: true },
          },
        },
      });

      if (!chatRecord || chatRecord.project?.userId !== userId) {
        return { success: false, message: "Access denied" };
      }

      await db
        .update(chats)
        .set({ deletedAt: new Date() })
        .where(eq(chats.id, chatId));

      return { success: true };
    }),
  deleteThread: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
        threadId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const { chatId, threadId } = input;

      const threadRecord = await db.query.threads.findFirst({
        where: and(eq(threads.id, threadId), eq(threads.chatId, chatId)),
        columns: {
          id: true,
        },
        with: {
          chat: {
            columns: {
              id: true,
              projectId: true,
            },
            with: {
              project: {
                columns: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (
        !threadRecord?.chat ||
        threadRecord.chat.project?.userId !== user.id
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found",
        });
      }

      await db.delete(threads).where(eq(threads.id, threadId));

      return { success: true } as const;
    }),
  moveThreadToNewChat: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
        threadId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const { chatId, threadId } = input;

      const threadRecord: ThreadWithChatProject | undefined =
        await db.query.threads.findFirst({
          where: and(eq(threads.id, threadId), eq(threads.chatId, chatId)),
          columns: {
            id: true,
            lastMessageAt: true,
            lastModelId: true,
          },
          with: {
            chat: {
              columns: {
                id: true,
                projectId: true,
                title: true,
              },
              with: {
                project: {
                  columns: {
                    id: true,
                    userId: true,
                  },
                },
              },
            },
          },
        });

      const chatRecord = threadRecord?.chat;
      const projectRecord = chatRecord?.project ?? null;

      if (!chatRecord || !projectRecord || projectRecord.userId !== user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found",
        });
      }

      const projectId = chatRecord.projectId;
      const lastMessageAt = threadRecord.lastMessageAt ?? new Date();
      const newChatId = generateChatId();

      const title = incrementTitle(chatRecord.title);
      await db
        .insert(chats)
        .values({
          id: newChatId,
          projectId,
          title,
          lastMessageAt,
        })
        .onConflictDoNothing();

      await db
        .update(threads)
        .set({
          chatId: newChatId,
        })
        .where(eq(threads.id, threadId));

      const newChatRecord = await db.query.chats.findFirst({
        where: eq(chats.id, newChatId),
        columns: {
          id: true,
          title: true,
          lastMessageAt: true,
          createdAt: true,
          projectId: true,
        },
      });

      if (!newChatRecord) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create chat",
        });
      }

      return {
        success: true as const,
        chat: newChatRecord,
      };
    }),
  deleteAllChats: authenticatedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) throw new Error("Assert: auth procedure must have user");

    const deletedAt = new Date();

    await db
      .update(messages)
      .set({ deletedAt })
      .where(
        and(
          isNull(messages.deletedAt),
          sql<boolean>`EXISTS (
              SELECT 1
              FROM ${threads} AS t
              INNER JOIN ${chats} AS c ON c.id = t.chat_id
              INNER JOIN ${projects} AS p ON p.id = c.project_id
              WHERE t.id = ${messages.threadId}
                AND p.user_id = ${user.id}
                AND p.deleted_at IS NULL
            )`
        )
      );

    await db
      .update(chats)
      .set({ deletedAt })
      .where(
        and(
          isNull(chats.deletedAt),
          sql<boolean>`EXISTS (
              SELECT 1
              FROM ${projects} AS p
              WHERE p.id = ${chats.projectId}
                AND p.user_id = ${user.id}
                AND p.deleted_at IS NULL
            )`
        )
      );

    return { success: true } as const;
  }),
});

interface ListChatsInput {
  userId: string;
  cursor?: string;
  limit?: number;
  projectId?: string;
}

export async function listChats({
  userId,
  cursor,
  limit: limitParam,
  projectId,
}: ListChatsInput) {
  const [cursorDate, cursorId] = parseCursor(cursor);
  const limit = limitParam ?? (cursor ? CHAT_LIST_PAGE_SIZE : 5);

  const result = await db
    .select({
      id: chats.id,
      title: chats.title,
      lastMessageAt: chats.lastMessageAt,
      createdAt: chats.createdAt,
      project: {
        id: projects.id,
        name: projects.name,
        color: projects.color,
        isDefault: sql<boolean>`${projects.id} = ${userId}`,
      },
    })
    .from(chats)
    .innerJoin(projects, eq(projects.id, chats.projectId))
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
        isNull(chats.deletedAt),
        projectId ? eq(chats.projectId, projectId) : undefined,
        cursorDate
          ? cursorId
            ? or(
                lt(chats.lastMessageAt, cursorDate),
                and(eq(chats.lastMessageAt, cursorDate), gt(chats.id, cursorId))
              )
            : lt(chats.lastMessageAt, cursorDate)
          : undefined
      )
    )
    .orderBy(desc(chats.lastMessageAt), asc(chats.id))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  const chatsData = hasMore ? result.slice(0, limit) : result;

  // Create next cursor from the last item
  let next: string | null = null;
  if (hasMore && chatsData.length > 0) {
    const lastChat = chatsData[chatsData.length - 1]!;
    next = `${lastChat.lastMessageAt.toISOString()}:${lastChat.id}`;
  }

  return {
    chats: chatsData.map((chat) => ({
      id: chat.id,
      title: chat.title,
      lastMessageAt: chat.lastMessageAt,
      createdAt: chat.createdAt,
      project: chat.project,
    })),
    next,
  };
}

function parseCursor(cursor: string | undefined) {
  if (!cursor) return [null, null] as const;

  const separatorIndex = cursor.lastIndexOf(":");
  if (separatorIndex <= 0) return [null, null] as const;

  const timestampStr = cursor.slice(0, separatorIndex);
  const id = cursor.slice(separatorIndex + 1);
  const cursorDate =
    timestampStr && !Number.isNaN(Date.parse(timestampStr))
      ? new Date(timestampStr)
      : null;

  if (!cursorDate) return [null, null] as const;

  return [cursorDate, id] as const;
}

const WorkerCompleteResponseSchema = z.object({
  text: z.string().nonempty(),
  finishReason: z.enum([
    "stop",
    "length",
    "content-filter",
    "tool-calls",
    "error",
    "other",
    "unknown",
  ]),
});

const UserMessageContentSchema = z.array(
  z.object({ type: z.literal("text"), text: z.string().nonempty() })
);

export async function getChatName(chatId: string, firstUserMessage?: string) {
  const userQuery = firstUserMessage ?? (await getChatFirstUserMessage(chatId));
  if (typeof userQuery !== "string") {
    return userQuery.error;
  }

  const chatNameResponse = await fetch(
    `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/complete`,
    {
      method: "POST",
      body: JSON.stringify({
        id: "1",
        maxTokens: 20,
        messages: [
          {
            id: "1",
            role: "user",
            parts: [
              {
                type: "text",
                text: [
                  "Given the following user message — the first message in a new chat — write a very short and natural title (maximum 5 words / 30 characters).",
                  "The title should summarize what the message is about, not describe that it’s a question or a request.",
                  "Avoid phrases like “Question about”, “Request to”, “Ask for”, or “Create”.",
                  "Use only plain text (no markdown, no punctuation at the end).",
                  "Write the title in the same language as the message.",
                  "Output only the title, nothing else.",
                  "",
                  "Message:",
                  "",
                  "<message>",
                  userQuery,
                  "</message>",
                ].join("\n"),
              },
            ],
          },
        ],
      }),
      headers: {
        "Content-Type": "application/json",
        "x-vz-model-id": "meta-llama/llama-3.2-3b-instruct",
        Authorization: `Internal ${INTERNAL_SECRET}`,
      },
    }
  );

  const chatName: unknown = await chatNameResponse.json();

  const chatNameParsed = WorkerCompleteResponseSchema.safeParse(chatName);
  if (!chatNameParsed.success) {
    return "Error 1004";
  }
  if (chatNameParsed.data.finishReason !== "stop") {
    console.warn(
      "Chat name generation finished with reason:",
      chatNameParsed.data.finishReason
    );
    switch (chatNameParsed.data.finishReason) {
      case "length":
        return "Error 1005";
      case "content-filter":
        return "Error 1006";
      case "tool-calls":
        return "Error 1007";
      case "error":
        return "Error 1008";
      case "other":
        return "Error 1009";
      case "unknown":
        return "Error 1010";
      default:
        return "Error 1011";
    }
  }

  return chatNameParsed.data.text;
}

async function getChatFirstUserMessage(chatId: string) {
  const userMessage = await db.query.messages.findMany({
    where: and(eq(messages.threadId, chatId), eq(messages.role, "user")),
    orderBy: (message, { asc }) => [asc(message.createdAt)],
    columns: { id: true, content: true },
    limit: 1,
  });

  if (!userMessage.length) {
    console.warn("No records found in database", chatId);
    return { error: "Error 1001" };
  }

  const userQueryRaw = UserMessageContentSchema.safeParse(
    userMessage?.[0]?.content
  );
  if (!userQueryRaw.success) {
    console.warn("No user query in database", userMessage);
    return { error: "Error 1002" };
  }
  const userQuery = userQueryRaw.data[0]?.text;
  if (!userQuery) {
    console.warn("User query is empty", userMessage);
    return { error: "Error 1003" };
  }
  return userQuery;
}

function incrementTitle(title: string) {
  const match = title.match(/ \((\d+)\)$/);
  if (match?.[1]) {
    const count = parseInt(match[1], 10);
    return title.replace(/\(\d+\)$/, `(${count + 1})`);
  }
  return `${title} (1)`;
}
