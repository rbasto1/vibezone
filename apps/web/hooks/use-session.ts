import type { Session, User } from "better-auth";
import { createContext, useContext } from "react";

export interface SessionContextValue {
  session: Session;
  user: User;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const serverSession = useContext(SessionContext);
  return serverSession;
}
