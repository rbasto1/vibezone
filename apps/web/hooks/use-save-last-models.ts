import { useUser } from "@/lib/auth-client";
import { MAX_PANELS } from "@/lib/constants";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import { useCallback } from "react";

export const useSaveLastModels = () => {
  const user = useUser();
  const setLastModels = trpc.users.setLastModels.useMutation();

  const saveLastModels = useCallback(
    (newPanels: PanelConfig[]) => {
      if (!user) return;
      const modelIds = newPanels.map((p) => p.model).slice(0, MAX_PANELS);
      setLastModels.mutate({ modelIds });
    },
    [user, setLastModels]
  );
  return saveLastModels;
};
