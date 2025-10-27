import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/components/ui/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  usePanelsConfigSetter,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { useUser } from "@/lib/auth-client";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import { trpc } from "@/lib/trpc/client";
import { BotIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ModelDropdownContents } from "./model-dropdown-contents";

interface AddAiButtonProps {
  panelCount: number;
  onAddPanel?: (id: string) => void;
}

export const AddAiButton: FC<AddAiButtonProps> = ({
  panelCount,
  onAddPanel,
}) => {
  const t = useTranslations("AssistantHeader");
  const setLastModels = trpc.users.setLastModels.useMutation();
  const setPanelsConfig = usePanelsConfigSetter();
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();
  const user = useUser();

  const canAddMore = panelCount < MAX_PANELS;
  const isMobile = useIsMobile();
  const [chooseModelOpen, setChooseModelOpen] = useState(false);
  const addButtonTitle = canAddMore
    ? t("addAnotherTooltip")
    : t("maxModelsTooltip", { max: MAX_PANELS });
  const addButtonLabel = t("addAiButton");
  const addButtonAriaLabel = t("addAiAriaLabel");

  const handleAddPanel = (providerId: string, modelId: string) => {
    const id = generateThreadId(panelCount);
    const newPanel = {
      id,
      provider: providerId,
      model: modelId,
    };
    setPanelsState((prev) => {
      const newPanels = {
        ...prev,
        [id]: { running: false, hasMessages: false },
      };
      return newPanels;
    });
    setPanelsConfig((prev) => {
      const newPanels = [...prev, newPanel];
      if (user) {
        // if we have a user, we save the last models to their profile
        const modelIds = newPanels.map((p) => p.model).slice(0, MAX_PANELS);
        setLastModels.mutate({ modelIds });
      }

      saveLastModels(newPanels);

      return newPanels;
    });
    onAddPanel?.(id);
    setChooseModelOpen(false);
  };

  const triggerClassName = cn(
    "h-8 w-8 rounded-full border border-transparent hover:border-border hover:bg-accent/40",
    canAddMore ? "" : "opacity-60 cursor-not-allowed"
  );

  const handleTriggerClick = () => {
    if (!canAddMore) return;
    setChooseModelOpen(true);
  };

  return (
    <>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={triggerClassName}
            disabled={!canAddMore}
            aria-label={addButtonAriaLabel}
            type="button"
            onClick={handleTriggerClick}
          >
            <BotIcon className="h-4 w-4" />
            <span className="sr-only">{addButtonLabel}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{addButtonTitle}</TooltipContent>
      </Tooltip>

      {isMobile ? (
        <Sheet open={chooseModelOpen} onOpenChange={setChooseModelOpen}>
          <SheetContent side="bottom" className="h-[100dvh] w-screen gap-0 p-0">
            <ModelDropdownContents
              onSelect={handleAddPanel}
              onClose={() => setChooseModelOpen(false)}
              variant="sheet"
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={chooseModelOpen} onOpenChange={setChooseModelOpen}>
          <DialogContent className="max-w-[min(1200px,95vw)] w-[min(1200px,95vw)] h-[min(85vh,720px)] p-0 overflow-hidden">
            <ModelDropdownContents
              onSelect={handleAddPanel}
              onClose={() => setChooseModelOpen(false)}
              variant="modal"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
