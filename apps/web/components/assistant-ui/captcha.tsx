import { cn } from "@/components/ui/utils";
import { useCaptchaState } from "@/hooks/use-captcha";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    turnstile: {
      render: (
        container: string,
        options: {
          sitekey: string;
          language?: string | undefined;
          theme?: string | undefined;
          execution?: "execute";
          callback: (token: string) => void;
          "error-callback"?: (errorCode: string) => void;
          "expired-callback"?: () => void;
        }
      ) => void;
      execute: (container: string) => void;
      reset: (container: string) => void;
    };
  }
}

export const Captcha = () => {
  const { theme } = useTheme();
  const language = useLocale();
  const [captchaState, setCaptchaToken] = useCaptchaState();
  const execution = captchaState.execution;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const renderContainer =
    captchaState.requested &&
    (captchaState.expiresAt === null || captchaState.expiresAt < Date.now());

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.turnstile ||
      !renderContainer
    ) {
      return;
    }

    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      toast.warning("Could not load Captcha; requests to AI may fail.");
      return;
    }

    const theme = themeRef.current;

    window.turnstile.render("#turnstile-container", {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      language,
      theme: ["light", "dark"].includes(theme ?? "") ? theme : "auto",
      callback: (token) => {
        execution.resolve(token);
        setCaptchaToken(token);
      },
      "error-callback": (code) => {
        console.error("Captcha failed:", code);
      },
      "expired-callback": () => {
        console.error("Captcha expired");
      },
    });
  }, [execution, renderContainer, language, setCaptchaToken]);

  if (!renderContainer) return null;

  return (
    <div
      id="turnstile-container"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200"
      )}
    />
  );
};
