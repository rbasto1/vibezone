import type { Env } from "../worker";

export async function validateCaptchaToken(
  token: string,
  env: Env
): Promise<{ success: boolean }> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY not set");
    return { success: false };
  }
  if (!env.ENVIRONMENT || env.ENVIRONMENT === "development") {
    console.warn({
      message: "Skipping Captcha verification",
      environment: env.ENVIRONMENT,
    });
    return { success: true };
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret,
          response: token,
        }),
      }
    );

    const json = await response.json();
    const result = json as {
      success: boolean;
      "error-codes"?: string[];
    };
    return { success: result.success };
  } catch (error) {
    console.error("Captcha validation error:", error);
    return { success: false };
  }
}
