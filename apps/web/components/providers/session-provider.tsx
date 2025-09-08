"use client";

import type { SessionContextValue } from "@/hooks/use-session";
import { SessionContext } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { useRef, type PropsWithChildren } from "react";

interface SessionProviderProps extends PropsWithChildren {
  serverAuthData: SessionContextValue | null;
}

export function SessionProvider({
  children,
  serverAuthData,
}: SessionProviderProps) {
  const { data, isPending } = authClient.useSession();
  const firstPending = useRef(isPending);
  if (!isPending && firstPending.current) {
    firstPending.current = false;
  }

  return (
    <SessionContext.Provider
      value={!firstPending.current ? data : serverAuthData}
    >
      {children}
    </SessionContext.Provider>
  );
}
