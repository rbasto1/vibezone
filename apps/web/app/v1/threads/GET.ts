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

  // TODO: Get threads from db

  const threads: CloudThread[] = [
    {
      title: "Test Thread",
      last_message_at: new Date(),
      metadata: {},
      external_id: null,
      id: "1",
      project_id: "1",
      created_at: new Date(),
      updated_at: new Date(),
      workspace_id: "1",
      is_archived: false,
    },
  ];

  return NextResponse.json({ threads });
}
