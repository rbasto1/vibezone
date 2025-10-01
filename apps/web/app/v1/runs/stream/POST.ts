import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestBody } from "@/app/api/request";
import type { NewMessage } from "@/db";
import { db, messages, threads } from "@/db";
import { auth } from "@/lib/auth";
import { MessageSchema } from "@/lib/trpc/messages";

const RunsStreamSchema = z.object({
  thread_id: z.string(),
  assistant_id: z.string(),
  messages: z.array(MessageSchema),
});

export async function POST(request: Request) {
  // Get authenticated user
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await getRequestBody(request, RunsStreamSchema);
  if (body instanceof Response) {
    return body;
  }

  try {
    // Verify thread belongs to user
    const thread = await db.query.threads.findFirst({
      where: and(eq(threads.id, body.thread_id)),
      with: {
        chat: true,
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (thread.chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Insert messages
    const messagesToInsert = body.messages.map(
      (message): NewMessage => ({
        id: message.id,
        threadId: body.thread_id,
        role: message.role,
        content: message.content,
        attachments: message.attachments || [],
        metadata: message.metadata || { custom: {} },
        status: message.status || {},
        createdAt:
          typeof message.createdAt === "string"
            ? new Date(message.createdAt)
            : (message.createdAt ?? new Date()),
        modelId: "",
      })
    );

    await db.insert(messages).values(messagesToInsert);

    // Update thread's last message timestamp
    const lastMessage = body.messages[body.messages.length - 1];
    if (lastMessage) {
      await db
        .update(threads)
        .set({
          lastMessageAt:
            typeof lastMessage.createdAt === "string"
              ? new Date(lastMessage.createdAt)
              : (lastMessage.createdAt ?? new Date()),
        })
        .where(eq(threads.id, body.thread_id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save messages:", error);
    return NextResponse.json(
      { error: "Failed to save messages" },
      { status: 500 }
    );
  }
}
