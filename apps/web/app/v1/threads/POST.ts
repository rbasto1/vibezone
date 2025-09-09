import { getRequestBody } from "@/app/api/request";
import { db, threads } from "@/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const ThreadPostSchema = z.object({
  last_message_at: z.iso.datetime(),
});

export async function POST(request: Request) {
  // Get authenticated user
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await getRequestBody(request, ThreadPostSchema);
  if (body instanceof Response) {
    return body;
  }

  // Create thread in database
  const threadId = crypto.randomUUID();

  try {
    await db.insert(threads).values({
      id: threadId,
      userId: session.user.id,
      title: "New Chat",
      lastMessageAt: new Date(body.last_message_at),
    });

    return NextResponse.json({ thread_id: threadId });
  } catch (error) {
    console.error("Failed to create thread:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}
