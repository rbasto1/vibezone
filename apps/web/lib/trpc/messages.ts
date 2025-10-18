import "server-only";

import { db } from "@/db";
import type { MessageMetadata } from "@/db/json-columns-types";
import { chats, messages, threads } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authenticatedProcedure, t } from "./server/initialize";

export const MessageMetadataSchema = z.object({
  custom: z.record(z.string(), z.unknown()),
  steps: z.array(z.unknown()).optional(),
  unstable_data: z.array(z.unknown()).optional(),
  unstable_state: z.null().optional(),
  unstable_annotations: z.array(z.unknown()).optional(),
});

export const MessageStatusSchema = z.object({
  type: z
    .enum(["running", "requires-action", "complete", "incomplete"])
    .optional(),
  reason: z
    .enum([
      "tool-calls",
      "stop",
      "unknown",
      "cancelled",
      "length",
      "content-filter",
      "other",
      "error",
      "interrupt",
    ])
    .optional(),
  error: z.unknown().optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.unknown(),
  attachments: z.array(z.any()).optional().readonly(),
  metadata: MessageMetadataSchema.optional(),
  status: MessageStatusSchema.optional(),
  createdAt: z.date().optional(),
});

export const messagesRouter = t.router({
  saveMessages: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
        threadId: z.string(), // This is the panelId
        modelId: z.string(),
        messages: z.array(MessageSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { chatId, threadId, modelId, messages: inputMessages } = input;
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      try {
        // Ensure chat exists
        const chatPromise = getOrInsertChat(chatId, user.id);

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

        // Insert messages into database (use upsert to handle duplicates)
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

        // Use upsert to handle potential duplicates
        for (const message of messagesToInsert) {
          await db
            .insert(messages)
            .values(message)
            .onConflictDoUpdate({
              target: messages.id,
              set: {
                content: message.content,
                attachments: message.attachments,
                metadata: message.metadata,
                status: message.status,
                updatedAt: new Date(),
              },
            });
        }

        const chat = await chatPromise;
        if (!chat) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create chat",
          });
        }

        return { success: true, count: messagesToInsert.length, chat } as const;
      } catch (error) {
        console.error("Failed to save messages:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save messages",
        });
      }
    }),
  rateMessage: authenticatedProcedure
    .input(
      z.object({
        messageId: z.string(),
        rate: z.enum(["dislike", "like", "really-like"]).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const { messageId, rate } = input;

      const messageRecord = await db.query.messages.findFirst({
        where: eq(messages.id, messageId),
        columns: {
          role: true,
          metadata: true,
        },
        with: {
          thread: {
            columns: { chatId: true },
            with: {
              chat: {
                columns: { userId: true },
              },
            },
          },
        },
      });

      if (!messageRecord || !messageRecord.thread?.chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      if (messageRecord.thread.chat.userId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      if (messageRecord.role !== "assistant") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only assistant messages can be rated",
        });
      }

      const existingMetadata: MessageMetadata = messageRecord.metadata ?? {
        custom: {},
      };

      const nextMetadata: MessageMetadata = {
        ...existingMetadata,
        custom: {
          ...existingMetadata.custom,
        },
      };

      if (rate) {
        nextMetadata.custom.rate = rate;
      } else {
        delete nextMetadata.custom.rate;
      }

      await db
        .update(messages)
        .set({ metadata: nextMetadata })
        .where(eq(messages.id, messageId));

      return {
        success: true as const,
        messageId,
        rate: nextMetadata.custom.rate ?? null,
      };
    }),
});

async function getOrInsertChat(chatId: string, userId: string) {
  console.info(`Creating new chat ${chatId} for user ${userId}`);
  const newChat = await db
    .insert(chats)
    .values({
      id: chatId,
      userId,
      title: "New Chat",
      lastMessageAt: new Date(),
    })
    .onConflictDoNothing()
    .returning()
    .then(
      (c) => c[0] ?? db.query.chats.findFirst({ where: eq(chats.id, chatId) })
    );

  return newChat;
}
