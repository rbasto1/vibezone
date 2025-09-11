import { getRequestBody } from "@/app/api/request";
import { db, messages, threads } from "@/db";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const ContentPartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

const MessageContentSchema = z.object({
  role: z.enum(["user", "assistant"]),
  parts: z.array(ContentPartSchema),
});

const ThreadMessagePostSchema = z.object({
  parent_id: z.string().nullable(),
  format: z.string(),
  content: MessageContentSchema,
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  // Get authenticated user
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: threadId } = await params;

  const body = await getRequestBody(request, ThreadMessagePostSchema);
  if (body instanceof Response) {
    return body;
  }

  try {
    // First verify the thread exists and belongs to the user
    const thread = await db.query.threads.findFirst({
      where: (threads, { eq, and, isNull }) =>
        and(eq(threads.id, threadId), isNull(threads.closedAt)),
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Generate a unique message ID
    const messageId = crypto.randomUUID();

    // Convert AI SDK v5 format to our storage format
    const contentParts = body.content.parts.map((part) => ({
      type: part.type,
      text: part.text || "",
    }));

    // Insert the message
    await db.insert(messages).values({
      id: messageId,
      threadId,
      modelId: "",
      role: body.content.role,
      content: contentParts,
      attachments: [],
      metadata: {},
      status: null,
      createdAt: new Date(),
    });

    // Update thread's last message timestamp
    await db
      .update(threads)
      .set({ lastMessageAt: new Date() })
      .where(eq(threads.id, threadId));

    return NextResponse.json({
      success: true,
      message_id: messageId,
    });
  } catch (error) {
    console.error("Failed to store message:", error);
    return NextResponse.json(
      { error: "Failed to store message" },
      { status: 500 }
    );
  }
}
