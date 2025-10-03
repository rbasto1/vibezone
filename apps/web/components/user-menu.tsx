"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import { useUIState } from "@/hooks/use-ui-state";
import { signOut, useUser } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { LoginModal } from "./login-model";
import { InlineSpinner } from "./ui/inline-spinner";

interface UserMenuProps {
  className?: string;
}

export const UserMenu = ({ className }: UserMenuProps) => {
  const { user, status } = useUser();
  const t = useTranslations("UserMenu");
  const [uiState, setUIState] = useUIState();
  const open = uiState.loginOpen;

  if (status === "unauthenticated") {
    return (
      <>
        <Button
          variant="outline"
          className={cn("h-8 px-2 text-sm", className)}
          onClick={() => setUIState({ loginOpen: true })}
        >
          {t("signInButton")}
        </Button>
        {open && <LoginModal />}
      </>
    );
  }

  if (status === "loading") {
    return (
      <div className="mx-8">
        <InlineSpinner style={{ borderColor: "var(--matrix-green)" }} />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("h-8 px-2 gap-2 flex items-center", className)}
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || user.email || t("fallbackName")}
              className="size-6 rounded-full"
              referrerPolicy="no-referrer"
              rel="noreferrer noopener"
            />
          ) : null}
          <span className="hidden sm:inline text-sm">
            {user?.name || user?.email || t("profileLabel")}
          </span>
          <span className="sr-only">{t("profileMenu")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium truncate">
              {user?.name || t("fallbackName")}
            </span>
            {user?.email && (
              <span className="text-muted-foreground text-xs truncate">
                {user.email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setUIState({ preferencesOpen: true })}>
          {t("preferences")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
