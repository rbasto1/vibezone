import { cors } from "./cors";
import { handleProviderStream } from "./stream";
import type { Env } from "./types";

export default {
  async fetch(
    request: Request,
    env: Env
    // ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const headers = cors(env, request);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers });
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return Response.json(
        {
          status: "ok",
          timestamp: new Date().toISOString(),
        },
        { headers }
      );
    }

    // Only allow POST
    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers }
      );
    }

    // Handle LLM streaming endpoint
    if (url.pathname === "/stream") {
      return handleProviderStream(request, env, headers);
    }

    return Response.json({ error: "Not found" }, { status: 404, headers });
  },
};
