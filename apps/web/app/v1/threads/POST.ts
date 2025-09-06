import { NextResponse } from "next/server";
import { z } from "zod";

const ThreadPostSchema = z.object({
  last_message_at: z.iso.datetime(),
});

export async function POST(request: Request) {
  const body = await getRequestBody(request, ThreadPostSchema);
  if (body instanceof Response) {
    return body;
  }

  // TODO: Create thread in db

  return NextResponse.json({ thread_id: crypto.randomUUID() });
}

export async function getRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>
) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
