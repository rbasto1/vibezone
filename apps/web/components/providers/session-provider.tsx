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
  const { data, isPending, refetch } = authClient.useSession();
  const firstPending = useRef(isPending);
  if (!isPending && firstPending.current) {
    firstPending.current = false;
  }

  const hydratedSession = !firstPending.current ? data : serverAuthData;
  const contextValue = hydratedSession
    ? {
        ...hydratedSession,
        refetch: !firstPending.current ? refetch : undefined,
      }
    : null;

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}
