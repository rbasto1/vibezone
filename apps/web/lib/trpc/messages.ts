import "server-only";

import { db } from "@/db";
import { chat, messages, threads } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
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
        const existingChat = await db.query.chat.findFirst({
          where: and(eq(chat.id, chatId), eq(chat.userId, ctx.user.id)),
        });

        if (!existingChat) {
          // Create chat if it doesn't exist
          await db.insert(chat).values({
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
});
