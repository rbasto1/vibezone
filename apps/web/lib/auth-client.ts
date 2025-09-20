"use client";

// Client-side auth facade using better-auth/react.

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null | undefined;
  isAdmin: boolean;
}

export interface UseUserResult {
  status: "loading" | "authenticated" | "unauthenticated";
  user?: AuthUser;
}

import { createAuthClient } from "better-auth/react";
import { baseUrl } from "./base-url";

export const authClient = createAuthClient({ baseURL: baseUrl });

export const useUser = (): UseUserResult => {
  const { data, isPending } = authClient.useSession();
  return {
    status: isPending
      ? "loading"
      : data?.user
        ? "authenticated"
        : "unauthenticated",
    user: data?.user as AuthUser | undefined,
  };
};

export const signInWithGoogle = (): void => {
  void authClient.signIn.social({ provider: "google" });
};

export const sendMagicLink = (email: string): Promise<void> => {
  // Fallback to direct API call to avoid type inference issues for plugin endpoints
  return authClient
    .$fetch("/sign-in/magic-link", {
      method: "POST",
      body: { email },
    })
    .then(() => undefined);
};

export const signOut = (): void => {
  void authClient.signOut();
};
