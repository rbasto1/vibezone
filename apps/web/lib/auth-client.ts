"use client";

import { useSession } from "@/hooks/use-session";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";
import { baseUrl } from "./base-url";

// Client-side auth facade using better-auth/react.

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null | undefined;
  isAdmin: boolean;
  preferenceAutoScroll: boolean;
  preferenceHiddenProviders: string[];
  preferenceSystemPrompt?: string | null;
  preferenceSystemPromptChangedAt?: Date | null;
  preferenceWebSearch: boolean;
  preferenceReasoningEffort: string;
}

export const authClient = createAuthClient({
  baseURL: baseUrl,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const useUser = (): AuthUser | undefined => {
  const data = useSession();
  return data?.user;
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
