import { SidebarTrigger } from "@/components/ui/sidebar";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

import { MAX_PANELS } from "@/lib/constants";

import { useAnonRemaining } from "@/hooks/use-anon-quota";
import {
  usePanelsConfigSetter,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { useSession } from "@/hooks/use-session";
import { generateThreadId } from "@/lib/id";
import { trpc } from "@/lib/trpc/client";
import { ANON_DAILY_LIMIT } from "@/store/anon-quota";
import type { FC } from "react";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../ui/utils";
import { ModelDropdownContents } from "./model-dropdown-contents";

interface AssistantHeaderProps {
  panelCount: number;
  suggestionsUsed: boolean;
}
export const AssistantHeader: FC<AssistantHeaderProps> = ({
  panelCount,
  suggestionsUsed,
}) => {
  const authData = useSession();
  const setLastModels = trpc.users.setLastModels.useMutation();
  const setPanelsConfig = usePanelsConfigSetter();
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();
  const [chooseModelOpen, setChooseModelOpen] = useState(false);
  const remaining = useAnonRemaining();
  const showMobileQuotaChip = !authData?.user && suggestionsUsed;
  const remainingLabel = `${remaining} of ${ANON_DAILY_LIMIT}`;

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
        [id]: { running: false, dirty: false },
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
                panelCount < MAX_PANELS
                  ? "hover:bg-accent"
                  : "opacity-60 cursor-not-allowed"
              )}
              disabled={panelCount >= MAX_PANELS}
              title={
                panelCount < MAX_PANELS
                  ? "Add another AI chat"
                  : `Maximum ${MAX_PANELS} models at a time; remove a model to add another`
              }
              aria-label="Add another AI chat"
            >
              Add AI
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            {chooseModelOpen && (
              <ModelDropdownContents
                onSelect={handleAddPanel}
                onClose={() => setChooseModelOpen(false)}
              />
            )}
          </DropdownMenuPortal>
        </DropdownMenu>

        <ThemeToggle />

        <div className="flex items-center gap-2">
          <div
            aria-hidden={showMobileQuotaChip || undefined}
            className={cn(
              "md:hidden overflow-hidden rounded-full border border-amber-300 bg-amber-200 text-amber-900 text-xs font-semibold tracking-tight transition-all duration-800 ease-out whitespace-nowrap",
              showMobileQuotaChip
                ? "max-w-[96px] px-2 py-1 opacity-100 ml-2"
                : "max-w-0 px-0 py-0 opacity-0"
            )}
          >
            {remainingLabel}
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
