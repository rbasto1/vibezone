export function cors(env: Env, request: Request) {
  // CORS headers for other endpoints
  const origin = request.headers.get("Origin");

  const allowed = ["http://localhost:3022", env.WORKER_ALLOWED_ORIGIN];

  const allowOrigin = origin && allowed.includes(origin) ? origin : "null";
  return new Headers({
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-vz-model-id",
  });
}
