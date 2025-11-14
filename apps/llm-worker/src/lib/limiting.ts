import { models } from "../generated/models";
import {
  getUsageDO,
  type CheckResponse,
  type UsageResponse,
} from "../objects/usage";
import type { VibezoneContext } from "../worker";
import { validateCaptchaToken } from "./captcha";
import { getSession } from "./clerk";
import {
  MAX_ANON_REQUESTS_PER_DAY,
  MAX_CAPTCHA_AGE_MS,
  MAX_USER_REQUESTS_PER_DAY,
} from "./constants";

export type AuthScheme = "Bearer" | "Anon" | "Internal";

export interface UsageContext {
  userId: string | null;
  userKey: string;
  remainingQuota: number;
}

interface UsageStats {
  scheme: AuthScheme;
  userId: string | null;
  userPlan: "paid" | "free" | null;
  userKey: string;
  limit: number;
}

type GetUserKeyResult =
  | { type: "success"; context: UsageStats }
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
    return {
      userId: context.userId,
      userKey: context.userKey,
      remainingQuota: Infinity,
    };
  }

  const captchaToken = vzContext.requestHeaders.get("cf-turnstile-response");
  if (!captchaToken) {
    return new Response("Captcha token required", { status: 403, headers });
  }

  const { env, completionRequest } = vzContext;
  const modelKey = completionRequest.config.modelId;
  const [modelId] = modelKey.split("#");
  if (!modelId) throw new Error("Assert: split returns a string");
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
    if (model.isIncluded || model.isPremium) {
      console.error({ message: "Please sign in to use this model", modelId });
      return new Response("Please sign in to use this model", {
        status: 403,
        headers,
      });
    }
  }

  const stub = getUsageDO(env, context.userKey);

  const res = await stub.fetch("https://internal/usage", { method: "POST" });
  if (!res.ok) {
    console.error({
      message: "Usage DO error",
      status: res.status,
      body: await res.text(),
    });
    return new Response("Too many requests", { status: 429, headers });
  }

  const body: UsageResponse = await res.json();

  const pass = isValidated(body.validatedAt);
  if (!pass) {
    const captchaValidation = await validateCaptchaToken(
      captchaToken,
      vzContext.env
    );

    if (captchaValidation.success) {
      await stub.fetch("https://internal/validate", { method: "POST" });
    } else {
      // We usually have multiple requests coming at the same time, and a race condition here
      // where we validate the captcha in the first request and the second fails because the
      // token is single-use, is common. So we have to retry the validation from our Durable
      // Object after a few milliseconds.
      await new Promise((resolve) => setTimeout(resolve, 200));
      const res = await stub.fetch("https://internal/check", {
        method: "POST",
      });
      if (!res.ok) {
        console.error({
          message: "Usage DO error",
          status: res.status,
          body: await res.text(),
        });
        return new Response("Too many requests", { status: 429, headers });
      }

      const body: CheckResponse = await res.json();
      if (!isValidated(body.validatedAt)) {
        console.warn({
          message: "Captcha validation failed",
          validatedAt: body.validatedAt,
        });
        return Response.json(
          { code: "CAPTCHA", message: "Invalid or expired captcha challenge" },
          { status: 403, headers }
        );
      }
    }
  }

  const remainingQuota = context.limit - body.dayCount;
  if (remainingQuota >= 0) {
    return {
      userId: context.userId,
      userKey: context.userKey,
      remainingQuota,
    };
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
      const userId = await getSession(token, vzContext.origin);
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

function isValidated(validatedAt: number | undefined) {
  if (!validatedAt) {
    return false;
  }

  const expiration = validatedAt + MAX_CAPTCHA_AGE_MS;
  return expiration > Date.now();
}
