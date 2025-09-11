import { db } from "@/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { CloudThread } from "./assistant-cloud-types";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return NextResponse.json({ threads: [] }, { status: 401 });
  }

  try {
    // Get chats from database for the authenticated user (non-archived only)
    const userChats = await db.query.chats.findMany({
      where: (chat, { eq, and, isNull }) =>
        and(
          eq(chat.userId, session.user.id),
          isNull(chat.deletedAt),
          eq(chat.isArchived, false)
        ),
      orderBy: (chat, { desc }) => [desc(chat.lastMessageAt)],
    });

    // Map database chats to CloudThread format (keeping the same interface for compatibility)
    const threads: CloudThread[] = userChats.map((chat) => ({
      title: chat.title,
      last_message_at: chat.lastMessageAt,
      metadata: {},
      external_id: null,
      id: chat.id,
      project_id: session.user.id, // Using user ID as project ID for now
      created_at: chat.createdAt,
      updated_at: chat.updatedAt,
      workspace_id: session.user.id, // Using user ID as workspace ID for now
      is_archived: chat.isArchived,
    }));

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Failed to fetch chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}
