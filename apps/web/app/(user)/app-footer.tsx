"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState, type FC } from "react";

import { CloseIconButton } from "@/components/ui/close-icon-button";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { trpc } from "@/lib/trpc/client";

const LEGAL_HIDE_STORAGE_KEY = "vz-hide-legal-footer";

interface AppFooterProps {
  isLoggedIn: boolean;
}

export const AppFooter: FC<AppFooterProps> = ({ isLoggedIn }) => {
  const t = useTranslations("Assistant");
  const [preferences, setPreferences] = useUserPreferences();
  const hideLegalPreference = preferences.hideLegal;
  const [sessionHideLegal, setSessionHideLegal] = useState(false);

  const hideLegalFooter = hideLegalPreference || sessionHideLegal;
  const updatePreferences = trpc.users.updatePreferences.useMutation({
    onSuccess: () => {
      setPreferences((prev) =>
        prev.hideLegal ? prev : { ...prev, hideLegal: true }
      );
    },
    onError: (error) => {
      console.error("Failed to update legal preference:", error);
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(LEGAL_HIDE_STORAGE_KEY);
    if (stored === "true") {
      setSessionHideLegal(true);
    }
  }, []);

  if (hideLegalFooter) return null;

  const handleDismissLegalFooter = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(LEGAL_HIDE_STORAGE_KEY, "true");
      setSessionHideLegal(true);
    }
    if (hideLegalPreference || !isLoggedIn) return;
    updatePreferences.mutate({ hideLegal: true });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 px-3 pb-0 text-xs text-muted-foreground [&>a]:underline">
      <span className="text-center">{t("aiDisclaimer")}</span>
      <Link href="/privacy" prefetch={false}>
        {t("privacyPolicy")}
      </Link>
      <Link href="/terms" prefetch={false}>
        {t("termsOfUse")}
      </Link>
      <CloseIconButton
        onClick={handleDismissLegalFooter}
        aria-label={t("legalDismissLabel")}
        className="h-3 w-3"
        buttonClassName="my-0.5"
      />
    </div>
  );
};
