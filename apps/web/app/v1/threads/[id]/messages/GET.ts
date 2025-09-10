import { db } from "@/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type {
  ChatWithThreadsResponse,
  CloudMessage,
} from "../../assistant-cloud-types";

interface RouteParams {
  params: Promise<{ id: string }>; // This is actually a chatId despite the URL structure
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return NextResponse.json({ messages: [], threads: [] }, { status: 401 });
  }

  const { id: chatId } = await params;

  try {
    // First verify the chat exists and belongs to the user
    const chatRecord = await db.query.chat.findFirst({
      where: (chat, { eq, and, isNull }) =>
        and(
          eq(chat.id, chatId),
          eq(chat.userId, session.user.id),
          isNull(chat.deletedAt)
        ),
    });

    if (!chatRecord) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Get all threads for this chat
    const chatThreads = await db.query.threads.findMany({
      where: (threads, { eq, and, isNull }) =>
        and(
          eq(threads.chatId, chatId),
          isNull(threads.closedAt) // Only get active threads
        ),
      orderBy: (threads, { asc }) => [asc(threads.createdAt)],
    });

    // Get all messages for all threads in this chat
    const threadIds = chatThreads.map((t) => t.id);
    const allMessages =
      threadIds.length > 0
        ? await db.query.messages.findMany({
            where: (messages, { inArray, and, isNull }) =>
              and(
                inArray(messages.threadId, threadIds),
                isNull(messages.deletedAt)
              ),
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          })
        : [];

    // Transform messages to CloudMessage format
    const messages: CloudMessage[] = allMessages.map((message) => {
      // Convert our stored content format to AI SDK v5 format
      const content = Array.isArray(message.content)
        ? {
            role: message.role as "user" | "assistant",
            parts: message.content,
          }
        : {
            role: message.role as "user" | "assistant",
            parts: [{ type: "text", text: "Invalid content format" }],
          };

      return {
        id: message.id,
        parent_id: null, // We don't track parent relationships yet
        height: 100, // Default height, could be calculated based on content
        created_at: message.createdAt,
        updated_at: message.updatedAt!,
        format: "ai-sdk/v5" as const,
        content,
      };
    });

    // Transform threads to include their messages
    const threads = chatThreads.map((thread) => ({
      id: thread.id,
      chatId: thread.chatId,
      lastModelId: thread.lastModelId,
      lastMessageAt: thread.lastMessageAt,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      closedAt: thread.closedAt,
      messages: messages.filter((msg) =>
        allMessages.find((m) => m.id === msg.id && m.threadId === thread.id)
      ),
    }));

    const response: ChatWithThreadsResponse = {
      chat: {
        id: chatRecord.id,
        title: chatRecord.title,
        isArchived: chatRecord.isArchived,
        lastMessageAt: chatRecord.lastMessageAt,
        createdAt: chatRecord.createdAt,
        updatedAt: chatRecord.updatedAt,
      },
      threads,
      messages, // Keep messages at root level for backward compatibility
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch chat data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat data" },
      { status: 500 }
    );
  }
}
