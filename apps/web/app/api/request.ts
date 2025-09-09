import { NextResponse } from "next/server";
import { z } from "zod";

export async function getRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>
) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      console.warn("Invalid request schema:", body);
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
