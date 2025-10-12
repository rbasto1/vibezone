import { chats, db, messages, threads } from "@/db";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gt, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";
import { CHAT_LIST_PAGE_SIZE, INTERNAL_SECRET } from "../constants";
import { searchChats } from "./chats-search";
import {
  authenticatedProcedure,
  publicProcedure,
  t,
} from "./server/initialize";

export const chatsRouter = t.router({
  listChats: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(CHAT_LIST_PAGE_SIZE),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        return {
          chats: [],
          next: null,
        };
      }
      return listChats({
        userId: ctx.user.id,
        cursor: input.cursor,
        limit: input.limit,
      });
    }),
  searchChats: authenticatedProcedure
    .input(
      z.object({
        query: z.string().min(2),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(CHAT_LIST_PAGE_SIZE),
      })
    )
    .query(({ ctx, input }) =>
      searchChats({
        userId: ctx.user.id,
        query: input.query,
        cursor: input.cursor,
        limit: input.limit,
      })
    ),

  renameChat: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
        title: z.string().nullable(),
        firstUserMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatId, title: inputTitle, firstUserMessage } = input;
      const userId = ctx.user.id;

      const chat = await db.query.chats.findFirst({
        columns: { id: true, userId: true },
        where: eq(chats.id, chatId),
      });
      if (chat && chat.userId !== userId) {
        return { success: false, message: "Access denied" } as const;
      }

      const title = inputTitle ?? (await getChatName(chatId, firstUserMessage));

      if (chat) {
        await db
          .update(chats)
          .set({
            title,
          })
          .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
      } else {
        await db
          .insert(chats)
          .values({
            id: chatId,
            userId,
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
    .query(async ({ input, ctx }) => {
      const { chatId } = input;

      // Get the chat
      const chatRecord = await db.query.chats.findFirst({
        where: and(
          eq(chats.id, chatId),
          eq(chats.userId, ctx.user.id),
          isNull(chats.deletedAt),
          eq(chats.isArchived, false)
        ),
        with: {
          threads: {
            with: {
              messages: {
                orderBy: [asc(messages.createdAt)],
              },
            },
            orderBy: [asc(threads.id)],
          },
        },
      });

      if (!chatRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      return chatRecord;
    }),

  archiveChat: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatId } = input;
      const userId = ctx.user.id;

      // Verify chat belongs to user and archive it
      const result = await db
        .update(chats)
        .set({
          isArchived: true,
          updatedAt: new Date(),
        })
        .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
      if (!result) {
        return { success: false, message: "Access denied" };
      }

      return { success: true };
    }),
});

interface ListChatsInput {
  userId: string;
  cursor?: string;
  limit?: number;
}

export async function listChats({
  userId,
  cursor,
  limit = CHAT_LIST_PAGE_SIZE,
}: ListChatsInput) {
  let whereCondition = and(
    eq(chats.userId, userId),
    isNull(chats.deletedAt),
    eq(chats.isArchived, false)
  );

  // Parse cursor if provided
  if (cursor) {
    const separatorIndex = cursor.lastIndexOf(":");
    if (separatorIndex > 0) {
      const timestampStr = cursor.slice(0, separatorIndex);
      const id = cursor.slice(separatorIndex + 1);
      const cursorDate =
        timestampStr && !Number.isNaN(Date.parse(timestampStr))
          ? new Date(timestampStr)
          : null;

      if (cursorDate) {
        const baseCondition = lt(chats.lastMessageAt, cursorDate);
        const cursorCondition =
          id.length > 0
            ? or(
                baseCondition,
                and(eq(chats.lastMessageAt, cursorDate), gt(chats.id, id))
              )
            : baseCondition;

        whereCondition = and(whereCondition, cursorCondition);
      }
    }
  }

  const result = await db.query.chats.findMany({
    where: whereCondition,
    orderBy: (chat, { desc, asc }) => [desc(chat.lastMessageAt), asc(chat.id)],
    limit: limit + 1, // Get one extra to check if there are more
  });

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
    })),
    next,
  };
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

async function getChatName(chatId: string, firstUserMessage?: string) {
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
                  "Looking at the following text, which is the first thing spoken in a conversation, generate a short title for the conversation (max 5 words, no more than 30 characters). It should be something that helps the user remember what their intention was when they started chatting. Do not include words like 'Inquiry' or 'Query', and just respond with the title, no need to preface it. Output plain text, no markdown. Write it in the same language the user used.",
                  "",
                  "<userQuery>",
                  userQuery,
                  "</userQuery>",
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

  const chatName = await chatNameResponse.json();

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
