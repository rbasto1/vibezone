"use client";

import { useCallback, useState } from "react";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import { useEventListener } from "@/hooks/use-event-listener";
import { useSession } from "@/hooks/use-session";
import { sendMagicLink, signOut } from "@/lib/auth-client";
import { useTranslations } from "next-intl";

interface UserMenuProps {
  className?: string;
}

export const UserMenu = ({ className }: UserMenuProps) => {
  const authData = useSession();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const t = useTranslations("UserMenu");
  useEventListener(
    "vz:open-login",
    useCallback(() => setOpen(true), [])
  );
  const isMobile =
    typeof navigator !== "undefined" &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const user = authData?.user;
  const dialogDescription = t("dialog.description");

  if (!user) {
    return (
      <>
        <Button
          variant="outline"
          className={cn("h-8 px-2 text-sm", className)}
          onClick={() => setOpen(true)}
        >
          {t("signInButton")}
        </Button>
        {open && (
          <Dialog defaultOpen onOpenChange={(v) => setOpen(!!v)}>
            <DialogContent aria-describedby="sign-in-description">
              <DialogHeader>
                <DialogTitle>{t("dialog.title")}</DialogTitle>
                {!sent && (
                  <DialogDescription id="sign-in-description">
                    {dialogDescription}
                  </DialogDescription>
                )}
              </DialogHeader>

              {sent ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm" id="sign-in-description">
                    {t("email.sent")}
                  </p>
                  <div className="pt-2">
                    <Button
                      className="min-w-[240px]"
                      onClick={() => setOpen(false)}
                    >
                      {t("email.close")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <GoogleSignInButton className="min-w-[240px]" />
                  </div>

                  {/* Divider with OR */}
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-muted-foreground text-xs">
                      {t("dividerOr")}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {t("email.heading")}
                    </div>
                    <form
                      className="space-y-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const eaddr = email.trim();
                        if (!eaddr) return;
                        setSending(true);
                        sendMagicLink(eaddr)
                          .then(() => setSent(true))
                          .finally(() => setSending(false));
                      }}
                    >
                      <input
                        type="email"
                        placeholder={t("email.placeholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus={!isMobile}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex justify-center">
                        <Button
                          size="sm"
                          type="submit"
                          className="min-w-[240px]"
                          disabled={sending || email.trim() === ""}
                        >
                          {sending ? t("email.sending") : t("email.send")}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </>
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
        <DropdownMenuItem onClick={() => signOut()}>
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
