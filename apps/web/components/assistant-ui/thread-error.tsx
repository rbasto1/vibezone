"use client";

import { CircleXIcon } from "@/components/ui/icons/circle-x-icon";
import { useSetDepleted } from "@/hooks/use-anon-quota";
import { useSession } from "@/hooks/use-session";
import { AlertCircleIcon } from "lucide-react";
import type { FC } from "react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { useTranslations } from "next-intl";

interface ThreadErrorProps {
  error: Error;
}

export const ThreadError: FC<ThreadErrorProps> = ({ error }) => {
  const session = useSession();
  const setDepleted = useSetDepleted();
  const t = useTranslations("ThreadError");

  if (error.message === "Out of credits") {
    const isLoggedIn = !!session?.user;
    if (!isLoggedIn) {
      setDepleted();
    }
    return (
      <div className="mx-auto w-full max-w-[var(--thread-max-width)] px-[var(--thread-padding-x)]">
        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4",
            isLoggedIn
              ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50"
              : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/50"
          )}
        >
          <div className="flex-shrink-0">
            <AlertCircleIcon
              className={cn(
                "h-5 w-5",
                isLoggedIn
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            />
          </div>
          <div className="flex-1 min-w-0 gap-4 flex flex-col">
            {isLoggedIn ? (
              <>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  {t("loggedInTitle")}
                </h3>
                <div className="mt-1 text-sm text-red-700 dark:text-red-300 overflow-y-hidden">
                  <p>{t("loggedInBody")}</p>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {t("anonymousTitle")}
                </h3>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      window.dispatchEvent(new Event("vz:open-login"));
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  {t("signInButton")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[var(--thread-max-width)] px-[var(--thread-padding-x)]">
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50">
        <div className="flex-shrink-0">
          <CircleXIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            {t("genericTitle")}
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300 overflow-y-hidden">
            {error.message}
          </p>
        </div>
      </div>
    </div>
  );
};
