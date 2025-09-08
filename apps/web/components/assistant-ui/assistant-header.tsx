import { SiteTopNav } from "@/components/site-topnav";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { MAX_PANELS } from "@/lib/constants";

import { useSession } from "@/hooks/use-session";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import type { FC } from "react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface AssistantHeaderProps {
  panelCount: number;
}

export const AssistantHeader: FC<AssistantHeaderProps> = ({ panelCount }) => {
  const authData = useSession();
  const setLastModels = trpc.users.setLastModels.useMutation();

  const saveLastModels = (newPanels: PanelConfig[]) => {
    if (!authData?.user) return;
    const modelIds = newPanels.map((p) => p.model).slice(0, MAX_PANELS);
    setLastModels.mutate({ modelIds });
  };

  return (
    <SiteTopNav
      extraLeft={<SidebarTrigger />}
      extraRight={
        <Button
          variant="outline"
          className={cn(
            panelCount < MAX_PANELS
              ? "hover:bg-accent"
              : "opacity-60 cursor-not-allowed"
          )}
          onClick={onAddPanel}
          disabled={panelCount >= MAX_PANELS}
          title={
            panelCount < MAX_PANELS
              ? "Add panel"
              : `Maximum ${MAX_PANELS} panels`
          }
          aria-label="Add panel"
        >
          Add panel
        </Button>
      }
    />
  );
};
