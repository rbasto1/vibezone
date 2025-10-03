import type { AuthUser } from "@/lib/auth-client";
import type { Session, SessionQueryParams } from "better-auth";
import { createContext, useContext } from "react";

export interface SessionContextValue {
  session: Session;
  user: AuthUser;
  refetch?: (queryParams?: { query?: SessionQueryParams }) => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const serverSession = useContext(SessionContext);
  return serverSession;
}
