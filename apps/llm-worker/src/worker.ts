import type { env } from "cloudflare:workers";
import { handleProviderComplete } from "./complete";
import { cors } from "./cors";
import { validateCaptchaToken } from "./lib/captcha";
import { getDb } from "./lib/db";
import type { UsageContext } from "./lib/limiting";
import { checkUsage } from "./lib/limiting";
import type { GetConfigResponseSuccess } from "./lib/request";
import { getConfigFromRequest } from "./lib/request";
import { handleProviderStream } from "./stream";
export { Usage } from "./objects/usage";

export type Env = typeof env;

export interface VibezoneContext {
  env: Env;
  db: ReturnType<typeof getDb>;
  requestHeaders: Headers;
  completionRequest: GetConfigResponseSuccess;
  usageContext: UsageContext | null;
}

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
      return new Response("Method not allowed", { status: 405, headers });
    }

    const [scheme, authToken] =
      request.headers.get("Authorization")?.split(" ") ?? [];
    if (!scheme || !authToken) {
      return new Response("Unauthorized", { status: 401, headers });
    }

    const rawBody = await request.json().catch((error) => new Error(error));
    if (rawBody instanceof Error) {
      return new Response("Invalid json body", {
        status: 400,
        headers,
      });
    }

    const completionRequest = getConfigFromRequest(request, rawBody);
    if (completionRequest.type === "error") {
      return new Response(completionRequest.error, { status: 400, headers });
    }

    // Validate Turnstile captcha token
    const captchaToken = request.headers.get("cf-turnstile-response");
    if (!captchaToken) {
      return new Response("Captcha token required", { status: 403, headers });
    }

    const captchaValidation = await validateCaptchaToken(captchaToken, env);
    if (!captchaValidation.success) {
      return new Response("Invalid captcha", { status: 403, headers });
    }

    const db = getDb(env);
    const vzContext: VibezoneContext = {
      env,
      db,
      requestHeaders: request.headers,
      completionRequest,
      usageContext: null,
    };

    // we have an anon user, let's keep track of their usage based on a fingerprint
    const usageResult = await checkUsage(vzContext, scheme, authToken, headers);
    if (usageResult instanceof Response) {
      return usageResult;
    }

    vzContext.usageContext = usageResult;

    switch (url.pathname) {
      case "/stream":
        // Handle LLM streaming endpoint
        return handleProviderStream(request, headers, vzContext);
      case "/complete":
        // Handle LLM non-streaming completion endpoint
        return handleProviderComplete(vzContext, headers);
      default:
        console.error({ message: "Invalid path", path: url.pathname });
        return new Response("Not found", { status: 404, headers });
    }
  },
};
