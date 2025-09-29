import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/lib/i18n/locales";

export default {
  defaultLocale: DEFAULT_LOCALE,
  locales: [...SUPPORTED_LOCALES] as AppLocale[],
};
