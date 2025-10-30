import "server-only";

import type { NewMessage } from "@/db";
import {
  chats as chatsTable,
  db,
  messageRatings as messageRatingsTable,
  messages as messagesTable,
  projects as projectsTable,
  threads as threadsTable,
} from "@/db";
import { TRPCError } from "@trpc/server";
import type {
  MessageMetadata,
  MessageRatingAttachment,
} from "@vibezone/database";
import { and, desc, eq, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import { getChatName } from "./chats";
import {
  authenticatedProcedure,
  publicProcedure,
  t,
} from "./server/initialize";

const messageRateSchema = z.enum(["dislike", "like", "really-like"]);

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
  parentId: z.string().nullable().optional(),
  branchNumber: z.number().optional(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.array(
    z
      .object({
        type: z.string(),
        text: z.string().optional(),
        filename: z.string().optional(),
        mimeType: z.string().optional(),
        data: z.string().optional(),
      })
      .loose()
  ),
  attachments: z.array(z.any()).optional().readonly(),
  metadata: MessageMetadataSchema.optional(),
  status: MessageStatusSchema.optional(),
  createdAt: z.date().optional(),
});

export const messagesRouter = t.router({
  saveUserMessage: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
        projectId: z.string(),
        threads: z.array(
          z.object({
            id: z.string(),
            modelId: z.string(),
            messages: z.array(MessageSchema),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { chatId, threads, projectId } = input;
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const firstThread = threads[0];
      if (!firstThread) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No threads provided",
        });
      }

      const firstUserMessage = firstThread.messages.find(
        (message) => message.role === "user"
      );

      const firstUserMessageText = firstUserMessage
        ? extractTextFromContent(firstUserMessage.content)
        : undefined;

      // Ensure project belongs to user
      const projectRecord = await db.query.projects.findFirst({
        where: and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, user.id),
          isNull(projectsTable.deletedAt)
        ),
      });
      if (!projectRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Ensure chat exists
      const chat = await getOrInsertChat(
        chatId,
        projectId,
        user.id,
        firstUserMessageText ? firstUserMessageText : undefined
      );
      if (!chat) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create chat",
        });
      }

      // Ensure threads exists
      await db
        .insert(threadsTable)
        .values(
          threads.map((t) => ({
            id: t.id,
            chatId,
            lastModelId: t.modelId,
            lastMessageAt: new Date(),
          }))
        )
        .onConflictDoNothing();

      await db
        .insert(messagesTable)
        .values(
          threads.flatMap((t) =>
            t.messages.map(
              (message) =>
                ({
                  id: message.id,
                  threadId: t.id,
                  modelId: t.modelId,
                  parentId: message.parentId,
                  branchNumber: message.branchNumber,
                  role: message.role,
                  content: message.content,
                  attachments: message.attachments,
                  metadata: message.metadata,
                  status: message.status,
                  createdAt: message.createdAt,
                }) satisfies NewMessage
            )
          )
        )
        .onConflictDoNothing();

      return { success: true, chat } as const;
    }),

  saveMessages: authenticatedProcedure
    .input(
      z.object({
        chatId: z.string(),
        threadId: z.string(), // This is the panelId
        modelId: z.string(),
        projectId: z.string(),
        messages: z.array(MessageSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        chatId,
        threadId,
        modelId,
        messages: inputMessages,
        projectId,
      } = input;
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      // Ensure project belongs to user
      const projectRecord = await db.query.projects.findFirst({
        where: and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, user.id),
          isNull(projectsTable.deletedAt)
        ),
      });
      if (!projectRecord) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Project not found",
        });
      }

      // Ensure chat exists
      const chatPromise = getOrInsertChat(chatId, projectId, user.id);

      // Ensure thread exists
      const existingThread = await db.query.threads.findFirst({
        where: eq(threadsTable.id, threadId),
      });

      if (!existingThread) {
        const chat = await chatPromise;
        if (!chat) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create chat",
          });
        }

        // Create thread if it doesn't exist
        await db.insert(threadsTable).values({
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
        parentId: msg.parentId,
        branchNumber: msg.branchNumber,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments,
        metadata: msg.metadata,
        status: msg.status,
        createdAt: msg.createdAt,
      }));

      // Use upsert to handle potential duplicates
      for (const message of messagesToInsert) {
        await db.insert(messagesTable).values(message).onConflictDoNothing();
        // .onConflictDoUpdate({
        //   target: messagesTable.id,
        //   set: {
        //     content: message.content,
        //     attachments: message.attachments,
        //     metadata: message.metadata,
        //     status: message.status,
        //   },
        // });
      }

      const chat = await chatPromise;
      if (!chat) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create chat",
        });
      }

      return { success: true, count: messagesToInsert.length, chat } as const;
    }),

  rateMessage: authenticatedProcedure
    .input(
      z.object({
        messageId: z.string(),
        rate: messageRateSchema.nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new Error("Assert: auth procedure must have user");

      const { messageId, rate } = input;

      const messageRecord = await db.query.messages.findFirst({
        where: eq(messagesTable.id, messageId),
        columns: {
          role: true,
          metadata: true,
          content: true,
          attachments: true,
          createdAt: true,
          threadId: true,
        },
        with: {
          thread: {
            columns: { chatId: true },
            with: {
              chat: {
                columns: { projectId: true },
                with: {
                  project: {
                    columns: { userId: true },
                  },
                },
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

      if (messageRecord.thread.chat.project?.userId !== user.id) {
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
        .update(messagesTable)
        .set({ metadata: nextMetadata })
        .where(eq(messagesTable.id, messageId));

      if (rate) {
        const promptMessage = await db.query.messages.findFirst({
          where: and(
            eq(messagesTable.threadId, messageRecord.threadId),
            eq(messagesTable.role, "user"),
            lte(messagesTable.createdAt, messageRecord.createdAt)
          ),
          orderBy: [desc(messagesTable.createdAt)],
          columns: {
            content: true,
          },
        });

        const promptText = ensureNonEmpty(
          extractTextFromContent(promptMessage?.content)
        );
        const responseText = ensureNonEmpty(
          extractTextFromContent(messageRecord.content)
        );
        const attachments = extractAttachmentsFromMessage(
          messageRecord.content,
          messageRecord.attachments
        );

        await db
          .insert(messageRatingsTable)
          .values({
            messageId,
            prompt: promptText,
            response: responseText,
            rate,
            attachments,
          })
          .onConflictDoUpdate({
            target: messageRatingsTable.messageId,
            set: { rate },
          });
      } else {
        await db
          .delete(messageRatingsTable)
          .where(eq(messageRatingsTable.messageId, messageId));
      }

      return {
        success: true as const,
        messageId,
        rate: nextMetadata.custom.rate ?? null,
      };
    }),

  rateMessageAnonymous: publicProcedure
    .input(
      z.object({
        ratingId: z.uuid().optional(),
        prompt: z.string().optional(),
        response: z.string().optional(),
        attachments: z
          .array(
            z.object({
              filename: z.string().min(1),
              mimeType: z.string().optional(),
            })
          )
          .optional(),
        rate: messageRateSchema.nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { ratingId, prompt, response, attachments, rate } = input;

      if (rate === null) {
        if (!ratingId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Rating ID is required",
          });
        }
        await db
          .delete(messageRatingsTable)
          .where(eq(messageRatingsTable.id, ratingId));
        return { success: true as const, ratingId: null };
      }

      if (ratingId) {
        const updated = await db
          .update(messageRatingsTable)
          .set({ rate })
          .where(eq(messageRatingsTable.id, ratingId))
          .returning({ id: messageRatingsTable.id });

        const record = updated[0];
        if (!record) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Rating not found",
          });
        }

        return { success: true as const, ratingId: record.id };
      }

      if (prompt === undefined || response === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Prompt and response are required",
        });
      }

      const inserted = await db
        .insert(messageRatingsTable)
        .values({
          prompt,
          response,
          attachments: attachments ?? [],
          rate,
        })
        .returning({ id: messageRatingsTable.id });

      const newRatingId = inserted[0]?.id ?? null;

      return {
        success: true as const,
        ratingId: newRatingId,
      };
    }),
});

async function getOrInsertChat(
  chatId: string,
  projectId: string,
  userId: string,
  firstUserMessage?: string
) {
  const existing = await db.query.chats.findFirst({
    where: eq(chatsTable.id, chatId),
    with: {
      project: {
        columns: { userId: true },
      },
    },
  });

  if (existing) {
    if (existing.project?.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access denied",
      });
    }

    if (existing.projectId !== projectId) {
      await db
        .update(chatsTable)
        .set({ projectId })
        .where(eq(chatsTable.id, chatId));

      const updated = await db.query.chats.findFirst({
        where: eq(chatsTable.id, chatId),
      });
      return updated ?? existing;
    }

    return existing;
  }

  const title = firstUserMessage
    ? await getChatName(chatId, firstUserMessage)
    : "New Chat";

  await db
    .insert(chatsTable)
    .values({
      id: chatId,
      projectId,
      title,
      lastMessageAt: new Date(),
    })
    .onConflictDoUpdate({
      target: chatsTable.id,
      set: {
        projectId,
        updatedAt: new Date(),
      },
    });

  const created = await db.query.chats.findFirst({
    where: eq(chatsTable.id, chatId),
  });

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to load chat",
    });
  }

  return created;
}

const ensureNonEmpty = (value: string): string => {
  return value.trim() || "[empty]";
};

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

const extractAttachmentsFromMessage = (
  content: unknown,
  attachments: unknown
): MessageRatingAttachment[] => {
  const summaries: MessageRatingAttachment[] = [];
  const seen = new Set<string>();

  const pushAttachment = (filename?: unknown, mimeType?: unknown) => {
    if (typeof filename !== "string" || filename.trim().length === 0) {
      return;
    }
    const normalizedFilename = filename.trim();
    const normalizedMime =
      typeof mimeType === "string" && mimeType.trim().length
        ? mimeType.trim()
        : undefined;
    const key = `${normalizedFilename}|${normalizedMime ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    summaries.push(
      normalizedMime
        ? { filename: normalizedFilename, mimeType: normalizedMime }
        : { filename: normalizedFilename }
    );
  };

  if (Array.isArray(attachments)) {
    for (const attachment of attachments) {
      if (!attachment || typeof attachment !== "object") continue;
      const record = attachment as Record<string, unknown>;
      pushAttachment(
        record.filename ?? record.name,
        record.mimeType ?? record.type
      );
    }
  }

  if (Array.isArray(content)) {
    for (const part of content) {
      if (!part || typeof part !== "object" || !("type" in part)) continue;
      const partRecord = part as Record<string, unknown>;
      const type = partRecord.type ?? "";

      if (type === "file" || type === "image") {
        pushAttachment(
          partRecord.filename ?? partRecord.name,
          partRecord.mimeType ?? partRecord.type
        );
      }
    }
  }

  return summaries;
};
