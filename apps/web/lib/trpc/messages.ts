import "server-only";

import { db } from "@/db";
import { chats, messages, threads } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticatedProcedure, t } from "./server/initialize";

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z
    .array(
      z
        .object({
          type: z.string(),
          text: z.string().optional(),
          // Add other content types as needed
        })
        .readonly()
    )
    .readonly(),
  attachments: z.array(z.any()).optional().readonly(),
  metadata: z.record(z.string(), z.any()).optional(),
  status: z.record(z.string(), z.any()).optional(),
  createdAt: z.date().optional(),
});

export const messagesRouter = t.router({
  saveMessages: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
        threadId: z.string(), // This is the panelId
        modelId: z.string(),
        messages: z.array(messageSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatId, threadId, modelId, messages: inputMessages } = input;

      try {
        // Ensure chat exists
        const existingChat = await db.query.chats.findFirst({
          where: and(eq(chats.id, chatId), eq(chats.userId, ctx.user.id)),
        });

        if (!existingChat) {
          // Create chat if it doesn't exist
          await db.insert(chats).values({
            id: chatId,
            userId: ctx.user.id,
            title: "New Chat",
            lastMessageAt: new Date(),
          });
        }

        // Ensure thread exists
        const existingThread = await db.query.threads.findFirst({
          where: eq(threads.id, threadId),
        });

        if (!existingThread) {
          // Create thread if it doesn't exist
          await db.insert(threads).values({
            id: threadId,
            chatId,
            lastModelId: modelId,
            lastMessageAt: new Date(),
          });
        }

        // Insert messages into database
        const messagesToInsert = inputMessages.map((msg) => ({
          id: msg.id,
          threadId,
          modelId,
          role: msg.role,
          content: msg.content,
          attachments: msg.attachments || null,
          metadata: msg.metadata || null,
          status: msg.status || null,
          createdAt: msg.createdAt || new Date(),
        }));

        await db.insert(messages).values(messagesToInsert);

        return { success: true, count: messagesToInsert.length };
      } catch (error) {
        console.error("Failed to save messages:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save messages",
        });
      }
    }),

  getChatWithThreads: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { chatId } = input;

      try {
        // Get the chat
        const chatRecord = await db.query.chats.findFirst({
          where: and(
            eq(chats.id, chatId),
            eq(chats.userId, ctx.user.id),
            isNull(chats.deletedAt),
            eq(chats.isArchived, false)
          ),
        });

        if (!chatRecord) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Chat not found",
          });
        }

        // Get all threads for this chat
        const chatThreads = await db.query.threads.findMany({
          where: and(
            eq(threads.chatId, chatId),
            isNull(threads.closedAt) // Only active threads
          ),
          orderBy: (threads, { asc }) => [asc(threads.createdAt)],
        });

        // Get all messages for all threads
        const threadIds = chatThreads.map((t) => t.id);
        const allMessages =
          threadIds.length > 0
            ? await db.query.messages.findMany({
                where: and(
                  inArray(messages.threadId, threadIds),
                  isNull(messages.deletedAt)
                ),
                orderBy: (messages, { asc }) => [asc(messages.createdAt)],
              })
            : [];

        // Group messages by thread
        const messagesByThread = new Map<string, typeof allMessages>();
        for (const message of allMessages) {
          const threadMessages = messagesByThread.get(message.threadId) || [];
          threadMessages.push(message);
          messagesByThread.set(message.threadId, threadMessages);
        }

        return {
          chat: chatRecord,
          threads: chatThreads.map((thread) => ({
            ...thread,
            messages: messagesByThread.get(thread.id) || [],
          })),
        };
      } catch (error) {
        console.error("Failed to fetch chat with threads:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch chat data",
        });
      }
    }),

  listChats: authenticatedProcedure.query(async ({ ctx }) => {
    try {
      const userChats = await db.query.chats.findMany({
        where: and(
          eq(chats.userId, ctx.user.id),
          isNull(chats.deletedAt),
          eq(chats.isArchived, false)
        ),
        orderBy: (chat, { desc }) => [desc(chat.lastMessageAt)],
      });

      return userChats;
    } catch (error) {
      console.error("Failed to fetch chats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch chats",
      });
    }
  }),

  archiveChat: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatId } = input;

      try {
        // Verify chat belongs to user and archive it
        const result = await db
          .update(chats)
          .set({
            isArchived: true,
            updatedAt: new Date(),
          })
          .where(and(eq(chats.id, chatId), eq(chats.userId, ctx.user.id)));
        if (!result) {
          return { success: false, message: "Access denied" };
        }

        return { success: true };
      } catch (error) {
        console.error("Failed to archive chat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to archive chat",
        });
      }
    }),
});
