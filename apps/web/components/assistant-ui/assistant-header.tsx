"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

import { MAX_PANELS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/components/ui/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  usePanelsConfigSetter,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { useSession } from "@/hooks/use-session";
import { generateThreadId } from "@/lib/id";
import { trpc } from "@/lib/trpc/client";
import type { FC } from "react";
import { useState } from "react";
import { AnonMobileQuotaLabel } from "./anon-mobile-quota-label";
import { ModelDropdownContents } from "./model-dropdown-contents";
import { useTranslations } from "next-intl";

interface AssistantHeaderProps {
  panelCount: number;
  suggestionsUsed: boolean;
}
export const AssistantHeader: FC<AssistantHeaderProps> = ({
  panelCount,
  suggestionsUsed,
}) => {
  const t = useTranslations("AssistantHeader");
  const authData = useSession();
  const setLastModels = trpc.users.setLastModels.useMutation();
  const setPanelsConfig = usePanelsConfigSetter();
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();
  const isMobile = useIsMobile();
  const [chooseModelOpen, setChooseModelOpen] = useState(false);
  const showMobileQuotaChip = !authData?.user && suggestionsUsed;
  const canAddMore = panelCount < MAX_PANELS;
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
        [id]: { running: false, dirty: false, hasMessages: false },
      };
      return newPanels;
    });
    setPanelsConfig((prev) => {
      const newPanels = [...prev, newPanel];
      if (authData?.user) {
        // if we have a user, we save the last models to their profile
        const modelIds = newPanels.map((p) => p.model).slice(0, MAX_PANELS);
        setLastModels.mutate({ modelIds });
      }

      saveLastModels(newPanels);

      return newPanels;
    });
  };

  return (
    <header className="flex h-16 shrink-0 items-center border-b px-4">
      <SidebarTrigger />

      <div className="ml-auto flex items-center">
        <DropdownMenu open={chooseModelOpen} onOpenChange={setChooseModelOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                canAddMore ? "hover:bg-accent" : "opacity-60 cursor-not-allowed"
              )}
              disabled={!canAddMore}
              title={addButtonTitle}
              aria-label={addButtonAriaLabel}
            >
              {addButtonLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            {chooseModelOpen &&
              (isMobile ? (
                <Sheet open={chooseModelOpen} onOpenChange={setChooseModelOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        canAddMore
                          ? "hover:bg-accent"
                          : "opacity-60 cursor-not-allowed"
                      )}
                      disabled={!canAddMore}
                      title={addButtonTitle}
                      aria-label={addButtonAriaLabel}
                    >
                      {addButtonLabel}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="h-[100dvh] w-screen gap-0 p-0"
                  >
                    <ModelDropdownContents
                      onSelect={handleAddPanel}
                      onClose={() => setChooseModelOpen(false)}
                      variant="sheet"
                    />
                  </SheetContent>
                </Sheet>
              ) : (
                <ModelDropdownContents
                  onSelect={handleAddPanel}
                  onClose={() => setChooseModelOpen(false)}
                />
              ))}
          </DropdownMenuPortal>
        </DropdownMenu>

        <ThemeToggle />
        <LanguageToggle />

        <div className="flex items-center gap-2">
          {showMobileQuotaChip ? <AnonMobileQuotaLabel /> : <div />}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
