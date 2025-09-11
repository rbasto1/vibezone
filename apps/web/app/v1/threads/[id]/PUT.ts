import { getRequestBody } from "@/app/api/request";
import { db, threads } from "@/db";
import { auth } from "@/lib/auth";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const ThreadUpdateSchema = z.object({
  is_archived: z.boolean(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  // Get authenticated user
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: threadId } = await params;

  const body = await getRequestBody(request, ThreadUpdateSchema);
  if (body instanceof Response) {
    return body;
  }

  try {
    // First verify the thread exists and belongs to the user
    const existingThread = await db.query.threads.findFirst({
      where: (threads, { eq, and, isNull }) =>
        and(eq(threads.id, threadId), isNull(threads.closedAt)),
    });

    if (!existingThread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Update the thread's archived status
    await db
      .update(threads)
      .set({
        closedAt: body.is_archived ? new Date() : null,
      })
      .where(and(eq(threads.id, threadId), isNull(threads.closedAt)));

    return NextResponse.json({
      success: true,
      is_archived: body.is_archived,
    });
  } catch (error) {
    console.error("Failed to update thread:", error);
    return NextResponse.json(
      { error: "Failed to update thread" },
      { status: 500 }
    );
  }
}
