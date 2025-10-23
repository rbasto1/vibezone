import { useAuth } from "@clerk/nextjs";

export const useAuthSession = () => {
  const session = useAuth();
  return session.sessionId;
};
