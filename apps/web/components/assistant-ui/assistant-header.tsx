"use client";

import type { FC } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import { useNewChatHandler } from "@/hooks/use-new-chat-handler";
import { useUser } from "@/lib/auth-client";
import { MessageCirclePlusIcon } from "lucide-react";
import { AddAiButton } from "./add-ai-button";
import { AnonMobileQuotaLabel } from "./anon-mobile-quota-label";

interface AssistantHeaderProps {
  panelCount: number;
  suggestionsUsed: boolean;
  onAddPanel?: (id: string) => void;
}

export const AssistantHeader: FC<AssistantHeaderProps> = ({
  panelCount,
  suggestionsUsed,
  onAddPanel,
}) => {
  const user = useUser();
  const handleNewChat = useNewChatHandler();
  const showMobileQuotaChip = !user && suggestionsUsed;

  return (
    <header className="flex h-16 shrink-0 items-center border-b px-4">
      <SidebarTrigger />

      <div className="ml-auto flex items-center">
        <AddAiButton panelCount={panelCount} onAddPanel={onAddPanel} />

        <Button
          variant="outline"
          size="icon"
          className="ml-2 md:hidden ld:hidden"
          onClick={() => handleNewChat({})}
        >
          <MessageCirclePlusIcon className="h-4 w-4" />
        </Button>

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
