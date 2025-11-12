import { useCallback } from "react";

import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";

export const useSaveLastProject = () => {
  const user = useUser();
  const mutation = trpc.users.setLastProject.useMutation();

  return useCallback(
    (projectId: string | null) => {
      if (!user) return;
      mutation.mutate({ projectId });
    },
    [mutation, user]
  );
};
