import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3022";

async function sendEmailWithResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) throw new Error("Missing RESEND_API_KEY or RESEND_FROM");

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "<no-body>");
    throw new Error(`Resend error ${resp.status}: ${body}`);
  }
}

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET!,
  cookies: nextCookies(),
  // baseUrl may be required depending on BetterAuth version
  // Explicitly set it to avoid callback URL mismatches in prod.
  baseUrl: APP_URL,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const subject = "Your sign-in link";
        const html = `
          <p>Click the link below to sign in:</p>
          <p><a href="${url}">Sign in</a></p>
          <p>This link will expire shortly. If you didn't request it, ignore this email.</p>
        `;
        await sendEmailWithResend(email, subject, html);
      },
    }),
  ],
});

export type Auth = typeof auth;
