import type { Chat } from "@/db";
import { chats, db } from "@/db";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { authenticatedProcedure, t } from "./server/initialize";

export const chatsRouter = t.router({
  listChats: authenticatedProcedure.query(async ({ ctx }) => {
    return listChats({ userId: ctx.user.id });
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
              messages: true,
            },
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
}

export async function listChats({ userId }: ListChatsInput): Promise<Chat[]> {
  const result = await db.query.chats.findMany({
    where: and(
      eq(chats.userId, userId),
      isNull(chats.deletedAt),
      eq(chats.isArchived, false)
    ),
    orderBy: (chat, { desc }) => [desc(chat.lastMessageAt)],
  });
  return result;
}
