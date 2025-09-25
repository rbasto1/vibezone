import { eq } from "drizzle-orm";

import { models } from "../generated/models";
import type { UsageResponse } from "../objects/usage";
import type { VibezoneContext } from "../worker";
import {
  MAX_ANON_REQUESTS_PER_DAY,
  MAX_USER_REQUESTS_PER_DAY,
} from "./constants";
import { schema } from "./db";

export type AuthScheme = "Bearer" | "Anon" | "Internal";

export interface UsageContext {
  scheme: AuthScheme;
  userId: string | null;
  userPlan: "paid" | "free" | null;
  userKey: string;
  limit: number;
}

type GetUserKeyResult =
  | { type: "success"; context: UsageContext }
  | { type: "error"; error: string };

export async function checkUsage(
  vzContext: VibezoneContext,
  scheme: string,
  token: string,
  headers: Headers
): Promise<Response | UsageContext> {
  const result = await getUserKey(scheme, token, vzContext);
  if (result.type === "error") {
    console.error({ message: "Invalid auth", error: result.error });
    return new Response(result.error, { status: 401, headers });
  }

  const { context } = result;

  if (context.limit === Infinity) {
    return context;
  }

  const { env, completionRequest } = vzContext;
  const modelId = completionRequest.config.modelId;
  const model = models[modelId];

  if (!model) {
    console.error({ message: "Model not found", modelId });
    return new Response("Model not found", { status: 404, headers });
  }

  if (context.userId) {
    if (context.userPlan === "free") {
      // TODO: eventually we will deny access to Premium models
    }
  } else {
    if (!model.isIncluded && !model.isPremium) {
      console.error({ message: "Please sign in to use this model", modelId });
      return new Response("Please sign in to use this model", {
        status: 403,
        headers,
      });
    }
  }

  const ns = env.USAGE;
  const id = ns.idFromName(context.userKey);
  const stub = ns.get(id);

  const res = await stub.fetch("https://internal/check", { method: "POST" });
  if (!res.ok) {
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
    limit: context.limit,
    dayCount: body.dayCount,
    monthCount: body.monthCount,
  });

  if (body.dayCount <= context.limit) {
    return context;
  }

  console.warn({
    message: `Too many requests, denying (${body.dayCount}/${context.limit})`,
  });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  headers.append("Retry-After", tomorrow.toUTCString());
  return new Response("Out of credits", {
    status: 429,
    headers,
  });
}

async function getUserKey(
  scheme: string,
  token: string,
  vzContext: VibezoneContext
): Promise<GetUserKeyResult> {
  switch (scheme as AuthScheme) {
    case "Bearer": {
      const userId = await getUserIdFromToken(token, vzContext);
      if (!userId) {
        return { type: "error", error: "Invalid session token" };
      }
      return {
        type: "success",
        context: {
          scheme: "Bearer",
          userId,
          userPlan: "free", // TODO: when we have paid plans, update this
          userKey: userId,
          limit: MAX_USER_REQUESTS_PER_DAY,
        },
      };
    }
    case "Anon": {
      const userKey = await getFingerprint(token, vzContext.requestHeaders);
      return {
        type: "success",
        context: {
          scheme: "Anon",
          userId: null,
          userPlan: null,
          userKey,
          limit: MAX_ANON_REQUESTS_PER_DAY,
        },
      };
    }
    case "Internal": {
      return {
        type: "success",
        context: {
          scheme: "Internal",
          userId: null,
          userPlan: null,
          userKey: token,
          limit: Infinity,
        },
      };
    }
    default:
      return { type: "error", error: "Invalid scheme" };
  }
}

async function getUserIdFromToken(token: string, vzContext: VibezoneContext) {
  const db = vzContext.db;
  const [sessionRecord] = await db
    .select({
      userId: schema.session.userId,
      expiresAt: schema.session.expiresAt,
    })
    .from(schema.session)
    .where(eq(schema.session.token, token))
    .limit(1);

  if (!sessionRecord) {
    return null;
  }

  if (sessionRecord.expiresAt <= new Date()) {
    return null;
  }

  return sessionRecord.userId;
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
