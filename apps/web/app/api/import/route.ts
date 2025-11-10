import { currentUser } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { baseUrl } from "@/lib/base-url";
import { createImportStream } from "@/lib/data-export/importer";
import { detectLocale } from "@/lib/i18n/detect-locale";

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

  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = detectLocale({
    cookies: cookieStore,
    headers: headerStore,
    baseUrl,
  });

  try {
    const stream = createImportStream({
      userId: user.id,
      file,
      locale,
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
