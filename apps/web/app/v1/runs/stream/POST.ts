import { getRequestBody } from "@/app/api/request";
import { db, messages, threads } from "@/db";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const ContentSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

const MessageSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.array(ContentSchema),
  attachments: z.array(z.any()).optional(),
  metadata: z
    .object({
      custom: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  status: z
    .object({
      type: z.string(),
      reason: z.string().optional(),
    })
    .optional(),
});

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
      where: (threads, { eq, and }) =>
        and(
          eq(threads.id, body.thread_id),
          eq(threads.userId, session.user.id)
        ),
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Insert messages
    const messagesToInsert = body.messages.map((message) => ({
      id: message.id,
      threadId: body.thread_id,
      role: message.role,
      content: message.content,
      attachments: message.attachments || [],
      metadata: message.metadata || {},
      status: message.status || null,
      createdAt: new Date(message.createdAt),
    }));

    await db.insert(messages).values(messagesToInsert);

    // Update thread's last message timestamp
    const lastMessage = body.messages[body.messages.length - 1];
    if (lastMessage) {
      await db
        .update(threads)
        .set({ lastMessageAt: new Date(lastMessage.createdAt) })
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
