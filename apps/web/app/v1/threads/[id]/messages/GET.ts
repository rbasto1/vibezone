import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { CloudMessage } from "../../assistant-cloud-types";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return NextResponse.json({ messages: [] }, { status: 401 });
  }

  // TODO: Get messages from db

  const messages: CloudMessage[] = [
    {
      id: "1",
      parent_id: null,
      height: 100,
      created_at: new Date(),
      updated_at: new Date(),
      format: "ai-sdk/v5",
      content: {
        role: "assistant",
        parts: [{ type: "text", text: "Hello, world!" }],
      },
    },
  ];

  return NextResponse.json({ messages });
}
