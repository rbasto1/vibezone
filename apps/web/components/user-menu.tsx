"use client";

import { useState } from "react";

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
import {
  sendMagicLink,
  signInWithGoogle,
  signOut,
  useUser,
} from "@/lib/auth-client";

interface UserMenuProps {
  className?: string;
}

export const UserMenu = ({ className }: UserMenuProps) => {
  const { user, status } = useUser();
  const [email, setEmail] = useState("");

  const isAuthed = status === "authenticated" && user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("h-8 px-2 gap-2 flex items-center", className)}
        >
          {isAuthed && user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || user.email || "User"}
              className="size-6 rounded-full"
              referrerPolicy="no-referrer"
              rel="noreferrer noopener"
            />
          ) : (
            <span
              aria-hidden
              className="size-6 rounded-full bg-muted flex items-center justify-center text-xs"
            >
              {user?.name?.[0]?.toUpperCase() ||
                user?.email?.[0]?.toUpperCase() ||
                "U"}
            </span>
          )}
          <span className="hidden sm:inline text-sm">
            {isAuthed ? user?.name || user?.email || "Profile" : "Sign in"}
          </span>
          <span className="sr-only">Open profile menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {isAuthed ? (
          <>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium truncate">
                  {user?.name || "User"}
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
              Sign out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>Sign in</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => signInWithGoogle()}>
              Continue with Google
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 flex items-center gap-2">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
              />
              <Button
                size="sm"
                onClick={() =>
                  email.trim() &&
                  sendMagicLink(email.trim())
                    .then(() => setEmail(""))
                    .catch(() => setEmail(email.trim()))
                }
              >
                Send link
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
