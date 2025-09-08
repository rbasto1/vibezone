import { SiteTopNav } from "@/components/site-topnav";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { MAX_PANELS } from "@/lib/constants";

import type { FC } from "react";
import { cn } from "../ui/utils";

interface AssistantHeaderProps {
  onAddPanel: () => void;
  panelCount: number;
}

export const AssistantHeader: FC<AssistantHeaderProps> = ({
  onAddPanel,
  panelCount,
}) => {
  return (
    <SiteTopNav
      extraLeft={<SidebarTrigger />}
      extraRight={
        <button
          type="button"
          className={cn(
            "h-9 rounded-md border px-3 text-sm transition-colors",
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
        </button>
      }
    />
  );
};
