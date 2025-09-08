import { MAX_PANELS } from "@/lib/constants";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import { useCallback } from "react";
import { useSession } from "./use-session";

export const useSaveLastModels = () => {
  const authData = useSession();
  const setLastModels = trpc.users.setLastModels.useMutation();

  const saveLastModels = useCallback(
    (newPanels: PanelConfig[]) => {
      if (!authData?.user) return;
      const modelIds = newPanels.map((p) => p.model).slice(0, MAX_PANELS);
      setLastModels.mutate({ modelIds });
    },
    [authData?.user, setLastModels]
  );
  return saveLastModels;
};
