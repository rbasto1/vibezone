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
    // Get threads from database for the authenticated user (non-archived only)
    const userThreads = await db.query.threads.findMany({
      where: (threads, { eq, and, isNull }) =>
        and(
          eq(threads.userId, session.user.id),
          isNull(threads.deletedAt),
          eq(threads.isArchived, false)
        ),
      orderBy: (threads, { desc }) => [desc(threads.lastMessageAt)],
    });

    // Map database threads to CloudThread format
    const threads: CloudThread[] = userThreads.map((thread) => ({
      title: thread.title,
      last_message_at: thread.lastMessageAt,
      metadata: {},
      external_id: null,
      id: thread.id,
      project_id: session.user.id, // Using user ID as project ID for now
      created_at: thread.createdAt!,
      updated_at: thread.updatedAt!,
      workspace_id: session.user.id, // Using user ID as workspace ID for now
      is_archived: thread.isArchived,
    }));

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Failed to fetch threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
