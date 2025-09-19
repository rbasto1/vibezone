import type { env } from "cloudflare:workers";
import { handleProviderComplete } from "./complete";
import { cors } from "./cors";
import { checkUsage } from "./lib/limiting";
import { handleProviderStream } from "./stream";

export type Env = typeof env;

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

    const [scheme, authToken] =
      request.headers.get("Authorization")?.split(" ") ?? [];
    if (!scheme || !authToken) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    }

    if (scheme === "Anon") {
      // we have an anon user, let's keep track of their usage based on a fingerprint
      const check = await checkUsage(request.headers, authToken);
      if (check instanceof Response) {
        return check;
      }
    }

    if (scheme === "Bearer") {
      // TODO: implement db query
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

    switch (url.pathname) {
      case "/stream":
        // Handle LLM streaming endpoint
        return handleProviderStream(request, env, headers);
      case "/complete":
        // Handle LLM non-streaming completion endpoint
        return handleProviderComplete(request, env, headers);
      default:
        return Response.json({ error: "Not found" }, { status: 404, headers });
    }
  },
};
