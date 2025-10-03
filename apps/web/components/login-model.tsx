import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { sendMagicLink } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useState } from "react";
import { Input } from "./ui/input";

export const LoginModal: FC = () => {
  const t = useTranslations("UserMenu");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const setUIState = useUIStateSetter();

  const isMobile =
    typeof navigator !== "undefined" &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const dialogDescription = t("dialog.description");
  const handleOpenChange = (v: boolean) => {
    setUIState({ loginOpen: v });
    if (!v) {
      setEmail("");
      setSent(false);
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
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
                onClick={() => handleOpenChange(false)}
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
              <div className="text-sm font-medium">{t("email.heading")}</div>
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
                <Input
                  type="email"
                  placeholder={t("email.placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus={!isMobile}
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
  );
};
