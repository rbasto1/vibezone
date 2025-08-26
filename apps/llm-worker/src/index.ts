import { handleOpenAIStream } from "./routes/openai";
import type { Env } from "./types";

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for other endpoints
    const origin = request.headers.get("Origin");
    const allowed = ["http://localhost:3022", env.WORKER_ALLOWED_ORIGIN].filter(
      Boolean
    );

    const allowOrigin = origin && allowed.includes(origin) ? origin : "null";

    const headers = new Headers({
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });

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

    // Handle OpenAI streaming endpoint
    if (url.pathname === "/api/chat/openai") {
      return handleOpenAIStream(request, env, headers);
    }

    // Mock streaming endpoints for Phase 1
    if (url.pathname.startsWith("/stream/")) {
      const provider = url.pathname.split("/")[2]; // openai, anthropic, gemini

      if (!provider || !["openai", "anthropic", "gemini"].includes(provider)) {
        return Response.json(
          { error: "Invalid provider" },
          { status: 400, headers }
        );
      }

      // Phase 1: Return mock response
      return Response.json(
        {
          provider,
          message: `Mock response from ${provider}. Phase 2 will implement real streaming.`,
          phase: "1",
          timestamp: new Date().toISOString(),
        },
        { headers }
      );
    }

    // Default response
    return Response.json(
      {
        message: "LLM Worker API",
        phase: "2 (OpenAI streaming implemented)",
        endpoints: [
          "/health",
          "/api/chat/openai",
          "/stream/openai",
          "/stream/anthropic",
          "/stream/gemini",
        ],
      },
      { headers }
    );
  },
};
