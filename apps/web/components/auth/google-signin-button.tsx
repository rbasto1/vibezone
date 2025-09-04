"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { signInWithGoogle } from "@/lib/auth-client";

interface GoogleSignInButtonProps extends React.ComponentProps<typeof Button> {
  className?: string;
}

export const GoogleSignInButton = ({ className, ...props }: GoogleSignInButtonProps) => {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      className={cn("flex items-center gap-2", className)}
      disabled={loading || props.disabled}
      onClick={(e) => {
        props.onClick?.(e);
        if (e.defaultPrevented) return;
        setLoading(true);
        // Redirects to Google; we leave loading true.
        signInWithGoogle();
      }}
      {...props}
    >
      {/* Google G icon */}
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.827 32.657 29.28 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.957 3.043l5.657-5.657C34.676 6.053 29.614 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.814C14.655 16.108 19.001 14 24 14c3.059 0 5.842 1.156 7.957 3.043l5.657-5.657C34.676 6.053 29.614 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
        <path fill="#4CAF50" d="M24 44c5.217 0 9.985-1.996 13.57-5.243l-6.25-5.287C29.32 35.459 26.787 36 24 36c-5.255 0-9.787-3.311-11.394-7.946l-6.49 5.001C9.435 39.556 16.195 44 24 44z"/>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.001 3.007-3.161 5.429-5.983 6.97l.001-.001 6.25 5.287C33.264 41.096 38 44 44 44c8.837 0 16-7.163 16-16 0-1.341-.138-2.651-.389-3.917z" transform="scale(.5) translate( -4, -4)"/>
      </svg>
      {loading ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
};

