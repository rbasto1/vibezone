"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import { ShortcutHint } from "@/components/ui/shortcut-hint";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useOpenSignIn } from "@/lib/auth-client";

interface ThreadListSearchProps {
  loggedIn: boolean;
}

export const ThreadListSearch: FC<ThreadListSearchProps> = ({ loggedIn }) => {
  const t = useTranslations("ThreadList");
  const setUIState = useUIStateSetter();
  const openSignIn = useOpenSignIn();
  const handleOpenSearch = () => {
    setUIState({ panelOpen: "search" });
  };

  return (
    <Button
      className="data-active:bg-muted hover:bg-muted w-full justify-between gap-2"
      variant="ghost"
      onClick={loggedIn ? handleOpenSearch : openSignIn}
    >
      <span className="flex items-center gap-2">
        <SearchIcon />
        {t("searchChats")}
      </span>
      <ShortcutHint combo={["cmdOrCtrl", "K"]} />
    </Button>
  );
};
