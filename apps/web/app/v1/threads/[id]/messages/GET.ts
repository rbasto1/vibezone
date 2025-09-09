import { db } from "@/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { CloudMessage } from "../../assistant-cloud-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return NextResponse.json({ messages: [] }, { status: 401 });
  }

  const { id: threadId } = await params;

  try {
    // First verify the thread exists and belongs to the user
    const thread = await db.query.threads.findFirst({
      where: (threads, { eq, and, isNull }) =>
        and(
          eq(threads.id, threadId),
          eq(threads.userId, session.user.id),
          isNull(threads.deletedAt)
        ),
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get messages for the thread
    const threadMessages = await db.query.messages.findMany({
      where: (messages, { eq, and, isNull }) =>
        and(eq(messages.threadId, threadId), isNull(messages.deletedAt)),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });

    // Transform messages to CloudMessage format
    const messages: CloudMessage[] = threadMessages.map((message) => {
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

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
