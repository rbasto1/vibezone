import { SearchPanel } from "@/components/assistant-ui/search-panel";
import { SidebarInset } from "@/components/ui/sidebar/sidebar-inset";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { useUIStateValue } from "@/hooks/use-ui-state";
import { FC } from "react";
import { AppThreads } from "./app-threads";
import PreferencesPage from "./preferences/tabs";

export const AppMain: FC = () => {
  const { panelOpen } = useUIStateValue();
  useGlobalShortcuts();

  return (
    <SidebarInset>
      {panelOpen === "preferences" && <PreferencesPage />}
      {panelOpen === "search" && <SearchPanel />}
      <AppThreads hide={!!panelOpen} />
    </SidebarInset>
  );
};
