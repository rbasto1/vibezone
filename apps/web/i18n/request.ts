import { baseUrl } from "@/lib/base-url";
import { detectLocale } from "@/lib/i18n/detect-locale";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/locales";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

const messageLoaders: Record<
  AppLocale,
  () => Promise<Record<string, unknown>>
> = {
  en: async () => (await import("@/messages/en.json")).default,
  "pt-BR": async () => (await import("@/messages/pt-BR.json")).default,
  de: async () => (await import("@/messages/de.json")).default,
};

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const cookieStorePromise = cookies();
  const headerStorePromise = headers();
  const preferredLocalePromise = locale ?? requestLocale;

  const [cookieStore, headerStore, preferredLocale] = await Promise.all([
    cookieStorePromise,
    headerStorePromise,
    preferredLocalePromise,
  ]);

  const resolvedLocale = detectLocale({
    cookies: cookieStore,
    headers: headerStore,
    fallback: preferredLocale,
    baseUrl,
  });
  const loadMessages =
    messageLoaders[resolvedLocale] ?? messageLoaders[DEFAULT_LOCALE];
  const messages = await loadMessages();

  return {
    locale: resolvedLocale,
    messages,
  };
});
