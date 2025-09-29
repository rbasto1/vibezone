"use client";

import { Check, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition, type FC } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LANGUAGE_COOKIE_MAX_AGE_SECONDS,
  LANGUAGE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/lib/i18n/locales";

const LOCALE_OPTIONS: AppLocale[] = [...SUPPORTED_LOCALES];

export const LanguageToggle: FC = () => {
  const currentLocale = useLocale();
  const t = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const normalizedCurrentLocale: AppLocale = LOCALE_OPTIONS.includes(
    currentLocale as AppLocale
  )
    ? (currentLocale as AppLocale)
    : SUPPORTED_LOCALES[0];

  const labels: Record<AppLocale, string> = {
    en: t("english"),
    "pt-BR": t("portugueseBrazil"),
    de: t("german"),
  };

  const handleSelectLocale = (locale: AppLocale) => {
    if (locale === normalizedCurrentLocale) return;

    document.cookie = `${LANGUAGE_COOKIE_NAME}=${locale}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-2"
          aria-label={t("trigger")}
          aria-busy={isPending}
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t("trigger")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALE_OPTIONS.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSelectLocale(locale)}
          >
            <span>{labels[locale]}</span>
            {locale === normalizedCurrentLocale && (
              <Check className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
