export const SUPPORTED_LOCALES = ["en", "pt-BR", "de"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export const LANGUAGE_COOKIE_CANDIDATES = ["vz-locale", "NEXT_LOCALE"] as const;
export const LANGUAGE_COOKIE_NAME = LANGUAGE_COOKIE_CANDIDATES[0];
export const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
