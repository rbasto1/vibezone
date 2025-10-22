"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import { useUIStateSetter } from "@/hooks/use-ui-state";

export const ThreadListSearch: FC = () => {
  const t = useTranslations("ThreadList");
  const setUIState = useUIStateSetter();

  const handleOpenSearch = () => {
    setUIState({ panelOpen: "search" });
  };

  return (
    <Button
      className="data-active:bg-muted hover:bg-muted justify-start"
      variant="ghost"
      onClick={handleOpenSearch}
    >
      <SearchIcon />
      {t("searchChats")}
    </Button>
  );
};
