import { currentUser } from "@clerk/nextjs/server";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

import { queueDataExport } from "@/lib/data-export/exporter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const user = await currentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = queueDataExport({
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      displayName: user.fullName,
    });

    waitUntil(result.task);

    return NextResponse.json(
      {
        jobId: result.jobId,
        estimatedReadyAt: result.estimatedReadyAt.toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[data-export] Failed to queue export:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error queuing export.";
    return NextResponse.json(
      { error: message },
      {
        status: 500,
      }
    );
  }
}
