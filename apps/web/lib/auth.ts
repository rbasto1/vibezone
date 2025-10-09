import { db } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { createTranslator } from "next-intl";
import { cookies } from "next/headers";
import deMessages from "../messages/de.json";
import enMessages from "../messages/en.json";
import ptBrMessages from "../messages/pt-BR.json";
import { baseUrl } from "./base-url";
import { detectLocale } from "./i18n/detect-locale";
import { sendEmailWithResend } from "./resend";

const AUTH_EMAIL_LOCALES = ["en", "pt-BR", "de"] as const;
type AuthEmailLocale = (typeof AUTH_EMAIL_LOCALES)[number];

const authEmailMessages: Record<
  AuthEmailLocale,
  (typeof enMessages)["AuthEmail"]
> = {
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
      sendMagicLink: async ({ email, url }, request) => {
        const locale = detectLocale({
          cookies: await cookies(),
          baseUrl,
          headers: request?.headers,
          fallback: "en",
        });
        const t = getAuthEmailTranslator(locale);
        const subject = t("subject");
        const linkText = t("linkText");
        const html = [
          `<p>${t("body.intro")}</p>`,
          `<p><a href="${url}">${linkText}</a></p>`,
          `<p>${t("body.expiry")}</p>`,
        ].join("");
        await sendEmailWithResend({ to: email, subject, html });
      },
    }),
  ],
  user: {
    additionalFields: {
      isAdmin: {
        type: "boolean",
        defaultValue: false,
      },
      preferenceAutoScroll: {
        type: "boolean",
        defaultValue: false,
      },
      preferenceHiddenProviders: {
        type: "string[]",
        defaultValue: [],
      },
      preferenceSystemPrompt: {
        type: "string",
        required: false,
      },
      preferenceSystemPromptChangedAt: {
        type: "date",
        required: false,
      },
      preferenceWebSearch: {
        type: "boolean",
        defaultValue: true,
      },
      preferenceReasoningEffort: {
        type: "string",
        defaultValue: "low",
      },
      preferenceSkipCloseThreadConfirmation: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
});

export type Auth = typeof auth;
