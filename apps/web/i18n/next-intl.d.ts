import type { AppLocale } from "@/lib/i18n/locales";
import type en from "@/messages/en.json";

type AppMessages = typeof en;

declare module "use-intl/core" {
  interface AppConfig {
    Messages: AppMessages;
    Locale: AppLocale;
  }
}
