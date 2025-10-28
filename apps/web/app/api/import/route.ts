import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createImportStream } from "@/lib/data-export/importer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return new NextResponse("Missing file", { status: 400 });
  }

  try {
    const stream = createImportStream({
      userId: user.id,
      file,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[data-import] Failed to start import:", error);
    const message =
      error instanceof Error ? error.message : "Unknown import error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
