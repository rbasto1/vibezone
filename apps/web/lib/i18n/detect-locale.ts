import {
  DEFAULT_LOCALE,
  LANGUAGE_COOKIE_CANDIDATES,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/lib/i18n/locales";

const supportedLocales = new Set<AppLocale>(SUPPORTED_LOCALES);

interface CookieLikeStore {
  get: (name: string) => { value: string } | undefined;
}

interface HeaderLikeStore {
  get: (name: string) => string | null | undefined;
}

interface DetectLocaleInput {
  readonly cookies?: CookieLikeStore | null;
  readonly headers?: HeaderLikeStore | null;
  readonly fallback?: string | null | undefined;
  readonly baseUrl?: string | null | undefined;
}

export function detectLocale({
  cookies,
  headers,
  fallback,
  baseUrl,
}: DetectLocaleInput): AppLocale {
  const cookieLocale = readLocaleFromCookies(cookies);
  if (cookieLocale) return cookieLocale;

  const acceptLanguageLocale = readLocaleFromAcceptLanguage(headers);
  if (acceptLanguageLocale) return acceptLanguageLocale;

  const domainLocale = readLocaleFromBaseUrl(baseUrl);
  if (domainLocale) return domainLocale;

  const fallbackLocale = toSupportedLocale(fallback ?? undefined);
  if (fallbackLocale) return fallbackLocale;

  return DEFAULT_LOCALE;
}

function readLocaleFromCookies(
  store?: CookieLikeStore | null
): AppLocale | undefined {
  if (!store) return undefined;

  for (const cookieName of LANGUAGE_COOKIE_CANDIDATES) {
    const value = store.get(cookieName)?.value;
    const locale = toSupportedLocale(value);
    if (locale) return locale;
  }

  return undefined;
}

function readLocaleFromAcceptLanguage(
  store?: HeaderLikeStore | null
): AppLocale | undefined {
  const headerValue = store?.get("accept-language");
  if (!headerValue) return undefined;

  const preferences = parseAcceptLanguage(headerValue);
  for (const preference of preferences) {
    const locale = toSupportedLocale(preference.tag);
    if (locale) return locale;
  }

  return undefined;
}

interface LanguagePreference {
  readonly tag: string;
  readonly weight: number;
}

function parseAcceptLanguage(header: string): LanguagePreference[] {
  const preferences: LanguagePreference[] = [];

  for (const part of header.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const [tag, ...params] = trimmed
      .split(";")
      .map((section) => section.trim());
    if (!tag) continue;

    let weight = 1;
    for (const param of params) {
      if (!param.startsWith("q=")) continue;
      const value = Number.parseFloat(param.slice(2));
      if (!Number.isNaN(value)) {
        weight = value;
        break;
      }
    }

    preferences.push({ tag, weight });
  }

  return preferences.toSorted((a, b) => b.weight - a.weight);
}

function readLocaleFromBaseUrl(
  candidate: string | null | undefined
): AppLocale | undefined {
  if (!candidate) return undefined;
  if (!URL.canParse(candidate)) return undefined;
  const hostname = new URL(candidate).hostname.toLowerCase();
  const tld = hostname.split(".").pop();
  switch (tld) {
    case "br":
      return "pt-BR";
    case "de":
      return "de";
    default:
      return undefined;
  }
}

function toSupportedLocale(
  candidate: string | undefined
): AppLocale | undefined {
  if (!candidate) return undefined;
  const trimmed = candidate.trim();
  if (!trimmed) return undefined;

  const canonical = canonicalizeLocale(trimmed);
  if (supportedLocales.has(canonical as AppLocale)) {
    return canonical as AppLocale;
  }

  const baseLanguage = canonical.split("-")[0];
  if (baseLanguage === "pt") return "pt-BR";
  if (baseLanguage === "en") return "en";

  return undefined;
}

function canonicalizeLocale(candidate: string): string {
  const normalized = candidate.replaceAll("_", "-");
  const segments = normalized.split("-");
  if (segments.length === 0) return normalized;

  const [languageSegment, ...rest] = segments;
  if (!languageSegment) return normalized;

  const canonicalLanguage = languageSegment.toLowerCase();
  if (rest.length === 0) return canonicalLanguage;

  const canonicalRest = rest.map((segment) => segment.toUpperCase());
  return [canonicalLanguage, ...canonicalRest].join("-");
}
