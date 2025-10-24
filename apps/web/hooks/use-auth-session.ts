import { useAuth } from "@clerk/nextjs";
import { useRef } from "react";

export function useAuthSession() {
  const { sessionId } = useAuth();
  const stable = useRef(sessionId);

  if (stable.current !== sessionId) {
    stable.current = sessionId;
  }

  return stable.current;
}
