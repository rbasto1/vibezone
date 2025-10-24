"use client";

import { useUser as useClerkUser } from "@clerk/nextjs";
import { useMemo, type ReactNode } from "react";

import type { FrontendUser } from "@/lib/auth-context";
import { AuthContext } from "@/lib/auth-context";

const USER_STALE_WINDOW_MS = 30_000;

interface AuthProviderProps {
  children: ReactNode;
  user: FrontendUser | null;
  userAsOfDate: number;
}

export const AuthProvider = ({
  children,
  user: serverUser,
  userAsOfDate,
}: AuthProviderProps) => {
  const { isLoaded, user: clerkUser } = useClerkUser();

  const user =
    !isLoaded && Date.now() - USER_STALE_WINDOW_MS < userAsOfDate
      ? serverUser
      : clerkUser;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contextUser = useMemo(() => user ?? null, [user?.id ?? null]);

  return (
    <AuthContext.Provider value={contextUser}>{children}</AuthContext.Provider>
  );
};
