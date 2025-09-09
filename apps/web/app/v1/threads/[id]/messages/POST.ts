import { getRequestBody } from "@/app/api/request";
import { auth } from "@/lib/auth";
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

export async function POST(request: Request) {
  // Get authenticated user
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await getRequestBody(request, ThreadMessagePostSchema);
  if (body instanceof Response) {
    return body;
  }

  // For now, we're ignoring this endpoint as it's duplicate information
  // that we already receive in the v1/runs/stream endpoint
  return NextResponse.json({
    success: true,
    message: "Message received but not stored (duplicate data)",
  });
}
