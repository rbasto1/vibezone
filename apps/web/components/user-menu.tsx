"use client";

import { useState } from "react";

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
import { sendMagicLink, signOut, useUser } from "@/lib/auth-client";

interface UserMenuProps {
  className?: string;
}

export const UserMenu = ({ className }: UserMenuProps) => {
  const { user, status } = useUser();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const isMobile =
    typeof navigator !== "undefined" &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const isAuthed = status === "authenticated" && user;

  if (!isAuthed) {
    return (
      <>
        <Button
          variant="ghost"
          className={cn("h-8 px-2 text-sm", className)}
          onClick={() => setOpen(true)}
        >
          Sign in
        </Button>
        {open ? (
          <Dialog defaultOpen onOpenChange={(v) => setOpen(!!v)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sign in</DialogTitle>
                {!sent && (
                  <DialogDescription>
                    Sign in or sign up to continue. You will have more chat
                    credits, be able to save your conversations, and mark your
                    favorite models.
                  </DialogDescription>
                )}
              </DialogHeader>

              {sent ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm">
                    Check your inbox for the sign-in link. It may take a minute
                    to arrive and can land in spam.
                  </p>
                  <div className="pt-2">
                    <Button
                      className="min-w-[240px]"
                      onClick={() => setOpen(false)}
                    >
                      Close
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
                    <span className="text-muted-foreground text-xs">OR</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Login with email</div>
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
                        placeholder="you@example.com"
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
                          {sending ? "Sending..." : "Send link"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        ) : null}
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
              alt={user.name || user.email || "User"}
              className="size-6 rounded-full"
              referrerPolicy="no-referrer"
              rel="noreferrer noopener"
            />
          ) : null}
          <span className="hidden sm:inline text-sm">
            {user?.name || user?.email || "Profile"}
          </span>
          <span className="sr-only">Open profile menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium truncate">{user?.name || "User"}</span>
            {user?.email && (
              <span className="text-muted-foreground text-xs truncate">
                {user.email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
