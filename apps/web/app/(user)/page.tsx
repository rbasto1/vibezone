"use client";

import type { FC } from "react";

import { AssistantHeader } from "@/components/assistant-ui/assistant-header";
import { ModelInfoModal } from "@/components/assistant-ui/model-info-modal";
import { ProjectDeleteModal } from "@/components/assistant-ui/project-delete-modal";
import { ProjectModal } from "@/components/assistant-ui/project-modal";
import { SearchPanel } from "@/components/assistant-ui/search-panel";
import { SidebarInset } from "@/components/ui/sidebar/sidebar-inset";
import { SidebarProvider } from "@/components/ui/sidebar/sidebar-provider";
import { useFocusPanelIdValue } from "@/hooks/use-focus-panel";
import { usePanelsConfigValue } from "@/hooks/use-panels";
import { useUIState } from "@/hooks/use-ui-state";
import { AppSidebarLoader } from "./app-sidebar-loader";
import { AppThreads } from "./app-threads";
import PreferencesPage from "./preferences";

const Assistant: FC = () => {
  const panelsConfig = usePanelsConfigValue();
  const [uiState, setUIState] = useUIState();

  const focusPanelId = useFocusPanelIdValue();

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <AppSidebarLoader />
        <SidebarInset>
          <AssistantHeader
            panelCount={panelsConfig.length}
            suggestionsUsed={uiState.suggestionsUsed}
            onAddPanel={
              focusPanelId
                ? () => setUIState({ focusPanelId: undefined })
                : undefined
            }
          />
          {uiState.panelOpen === "preferences" && <PreferencesPage />}
          {uiState.panelOpen === "search" && <SearchPanel />}
          <AppThreads hide={!!uiState.panelOpen} />
        </SidebarInset>
      </div>
      {uiState.detailsModelId && (
        <ModelInfoModal
          modelId={uiState.detailsModelId}
          onOpenChange={(open) => {
            if (!open) {
              setUIState({ detailsModelId: undefined });
            }
          }}
        />
      )}
      {uiState.createProject && <ProjectModal mode="create" />}
      {uiState.editProject && (
        <ProjectModal mode="edit" project={uiState.editProject} />
      )}
      {uiState.deleteProject && (
        <ProjectDeleteModal project={uiState.deleteProject} />
      )}
    </SidebarProvider>
  );
};

export default Assistant;
