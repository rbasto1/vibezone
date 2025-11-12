"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, type FC } from "react";

import { CloseIconButton } from "@/components/ui/close-icon-button";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { LEGAL_HIDE_STORAGE_KEY } from "@/lib/constants";
import { trpc } from "@/lib/trpc/client";

interface AppFooterProps {
  isLoggedIn: boolean;
  onHide: () => void;
}

export const AppFooter: FC<AppFooterProps> = ({ isLoggedIn, onHide }) => {
  const t = useTranslations("Assistant");
  const [preferences, setPreferences] = useUserPreferences();
  const hideLegalPreference = preferences.hideLegal;

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
    if (hideLegalPreference) onHide();
  }, [hideLegalPreference]);

  if (hideLegalPreference) return null;

  const handleDismissLegalFooter = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(LEGAL_HIDE_STORAGE_KEY, "true");
      onHide();
    }
    if (hideLegalPreference || !isLoggedIn) return;
    updatePreferences.mutate({ hideLegal: true });
  };

  return (
    <div className="sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-3 px-3 pb-0 text-xs text-muted-foreground [&>a]:underline text-center space-x-2 sm:space-x-0 [&>*]:inline-block leading-tight">
      <span>{t("aiDisclaimer")}</span>
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
