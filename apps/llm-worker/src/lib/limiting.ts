import type { UsageResponse } from "../objects/usage";
import type { Env } from "../worker";
import {
  MAX_ANON_REQUESTS_PER_DAY,
  MAX_USER_REQUESTS_PER_DAY,
} from "./constants";

export async function checkUsage(
  headers: Headers,
  scheme: string,
  token: string,
  env: Env
) {
  const { userKey, limit, error } = await getUserKey(scheme, token, headers);
  if (error) {
    return error;
  }

  if (limit === Infinity) return null;

  // Use Durable Object keyed by the user key
  const ns = env.USAGE;
  const id = ns.idFromName(userKey);
  const stub = ns.get(id);

  const res = await stub.fetch("https://internal/check", { method: "POST" });
  if (!res.ok) {
    // If the DO errors, reject request to protect the service
    console.error({
      message: "Usage DO error",
      status: res.status,
      body: await res.text(),
    });
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const body: UsageResponse = await res.json();
  console.debug({ message: "DO response", body: JSON.stringify(body) });

  if (body.dayCount <= limit) return null;

  console.warn({
    message: `Too many requests, denying (${body.dayCount}/${limit})`,
  });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return Response.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": tomorrow.toUTCString() } }
  );
}

export async function getUserKey(
  scheme: string,
  token: string,
  headers: Headers
) {
  switch (scheme) {
    case "Bearer": {
      // TODO: get userId from database
      const userKey = token;
      return { userKey, limit: MAX_USER_REQUESTS_PER_DAY, error: null };
    }
    case "Anon": {
      const userKey = await getFingerprint(token, headers);
      return { userKey, limit: MAX_ANON_REQUESTS_PER_DAY, error: null };
    }
    case "Internal": {
      return { userKey: "", limit: Infinity, error: null };
    }
    default:
      return { error: new Response("Invalid scheme", { status: 401 }) };
  }
}

async function getFingerprint(token: string, headers: Headers) {
  const data = [
    headers.get("CF-Connecting-IP"),
    headers.get("X-Forwarded-For"),
    headers.get("User-Agent"),
    headers.get("Accept-Language"),
    token,
  ];

  return await createHash(data);
}

async function createHash(data: unknown) {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(JSON.stringify(data))
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}
