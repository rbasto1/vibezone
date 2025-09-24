import type { UsageResponse } from "../objects/usage";
import type { Env } from "../worker";
import {
  MAX_ANON_REQUESTS_PER_DAY,
  MAX_USER_REQUESTS_PER_DAY,
} from "./constants";

export async function checkUsage(
  requestHeaders: Headers,
  scheme: string,
  token: string,
  env: Env,
  headers: Headers
) {
  const { userKey, limit, error } = await getUserKey(
    scheme,
    token,
    requestHeaders
  );
  if (error !== null) {
    console.error({ message: "Invalid auth", error });
    return new Response(error, { status: 401, headers });
  }

  if (limit === Infinity) return null;

  // TODO: check if user has access
  // If user is not logged in, model has to have included=false and premium=false

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
    return new Response("Too many requests", { status: 429, headers });
  }

  const body: UsageResponse = await res.json();
  console.debug({
    message: "Usage",
    limit,
    dayCount: body.dayCount,
    monthCount: body.monthCount,
  });

  if (body.dayCount <= limit) return null;

  console.warn({
    message: `Too many requests, denying (${body.dayCount}/${limit})`,
  });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  headers.append("Retry-After", tomorrow.toUTCString());
  return new Response("Out of credits", {
    status: 429,
    headers,
  });
}

type GetUserKeyReturn = GetUserKeyReturnSuccess | GetUserKeyReturnError;
interface GetUserKeyReturnSuccess {
  userKey: string;
  limit: number;
  error: null;
}
interface GetUserKeyReturnError {
  userKey?: string;
  limit?: number;
  error: string;
}

export async function getUserKey(
  scheme: string,
  token: string,
  requestHeaders: Headers
): Promise<GetUserKeyReturn> {
  switch (scheme) {
    case "Bearer": {
      // TODO: get userId from database
      const userKey = token;
      return { userKey, limit: MAX_USER_REQUESTS_PER_DAY, error: null };
    }
    case "Anon": {
      const userKey = await getFingerprint(token, requestHeaders);
      return { userKey, limit: MAX_ANON_REQUESTS_PER_DAY, error: null };
    }
    case "Internal": {
      return { userKey: "", limit: Infinity, error: null };
    }
    default:
      return { error: "Invalid scheme" };
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
