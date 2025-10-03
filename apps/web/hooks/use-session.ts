import type { AuthUser } from "@/lib/auth-client";
import type { Session } from "better-auth";
import { createContext, useContext } from "react";

export interface SessionContextValue {
  session: Session;
  user: AuthUser;
  refetch?: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const serverSession = useContext(SessionContext);
  return serverSession;
}
