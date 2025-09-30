import { db } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { createTranslator } from "next-intl";
import deMessages from "../messages/de.json";
import enMessages from "../messages/en.json";
import ptBrMessages from "../messages/pt-BR.json";
import { baseUrl } from "./base-url";

const AUTH_EMAIL_LOCALES = ["en", "pt-BR", "de"] as const;
type AuthEmailLocale = (typeof AUTH_EMAIL_LOCALES)[number];

const authEmailMessages: Record<AuthEmailLocale, Record<string, string>> = {
  en: enMessages.AuthEmail,
  "pt-BR": ptBrMessages.AuthEmail,
  de: deMessages.AuthEmail,
};

const defaultAuthLocale: AuthEmailLocale = AUTH_EMAIL_LOCALES.includes(
  process.env.DEFAULT_LOCALE as AuthEmailLocale
)
  ? (process.env.DEFAULT_LOCALE as AuthEmailLocale)
  : "en";

const getAuthEmailTranslator = (locale?: string) => {
  const normalizedLocale = AUTH_EMAIL_LOCALES.includes(
    locale as AuthEmailLocale
  )
    ? (locale as AuthEmailLocale)
    : defaultAuthLocale;

  return createTranslator({
    locale: normalizedLocale,
    messages: authEmailMessages[normalizedLocale],
  });
};

async function sendEmailWithResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from)
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM");

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
  secret: process.env.AUTH_SECRET,
  cookies: nextCookies(),
  baseUrl,
  database: drizzleAdapter(db, { provider: "pg" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const t = getAuthEmailTranslator();
        const subject = t("subject");
        const html = t("bodyHtml", {
          url,
          linkText: t("linkText"),
        });
        await sendEmailWithResend(email, subject, html);
      },
    }),
  ],
  user: {
    additionalFields: {
      isAdmin: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
});

export type Auth = typeof auth;
