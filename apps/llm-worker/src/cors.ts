import type { Env } from "./worker";

export function cors(env: Env, request: Request) {
  // CORS headers for other endpoints
  const origin = request.headers.get("Origin");

  const allowed = [
    "https://www.vibezone.ai",
    "https://www.multipla.ia.br",
    "http://localhost:3022",
    /https:\/\/\S+-rbasto-team\.vercel\.app/,
  ];

  const allowOrigin =
    origin &&
    allowed.some((a) => (typeof a === "string" ? a === origin : a.test(origin)))
      ? origin
      : "null";
  return new Headers({
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-vz-model-id, cf-turnstile-response",
  });
}
