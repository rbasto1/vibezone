import { useTranslations } from "next-intl";
import type { FC } from "react";

import { cn } from "@/components/ui/utils";
import { usePanelsConfigValue, usePanelsStateValue } from "@/hooks/use-panels";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { modelMap } from "@/lib/model-map";

interface MobileThreadTabButtonsProps {
  focusPanelId: string | undefined;
}

export const MobileThreadTabButtons: FC<MobileThreadTabButtonsProps> = ({
  focusPanelId,
}) => {
  const t = useTranslations("Assistant");
  const panelsState = usePanelsStateValue();
  const panelsConfig = usePanelsConfigValue();
  const setUIState = useUIStateSetter();

  return (
    <div className="-mx-1 px-1">
      <div
        className="flex items-center border-b border-border rounded-t-md overflow-hidden"
        role="tablist"
      >
        {panelsConfig.map((panel, index) => {
          const modelLabel = modelMap.get(panel.model)?.name ?? panel.model;
          const label = `${index + 1}: ${modelLabel}`;
          const isActive = focusPanelId === panel.id;
          const isRunning = panelsState[panel.id]?.running;
          return (
            <div
              key={panel.id}
              className={cn(
                "relative flex-1 basis-1/3 min-w-0 border-b-2",
                isActive
                  ? "border-primary"
                  : "border-transparent hover:border-border"
              )}
            >
              <button
                type="button"
                onClick={() => setUIState({ focusPanelId: panel.id })}
                className={cn(
                  "relative w-full h-full px-3 py-2 text-sm font-medium truncate transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  isActive
                    ? "text-foreground bg-background"
                    : "text-muted-foreground hover:text-foreground",
                  isRunning && "panel-button-glow"
                )}
                aria-pressed={isActive}
                aria-selected={isActive}
                aria-label={t("panelAriaLabel", { index: index + 1 })}
                role="tab"
              >
                <span className="text">{label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
