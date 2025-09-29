export const SUPPORTED_LOCALES = ["en", "pt-BR", "de"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export const LANGUAGE_COOKIE_CANDIDATES = ["vz-locale", "NEXT_LOCALE"] as const;
