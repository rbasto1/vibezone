"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import type { FC } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { ModelInfoModal } from "@/components/assistant-ui/model-info-modal";
import { ProjectDeleteModal } from "@/components/assistant-ui/project-delete-modal";
import { ProjectModal } from "@/components/assistant-ui/project-modal";
import { MobileSidebarTrigger } from "@/components/mobile-sidebar-trigger";
import { SidebarProvider } from "@/components/ui/sidebar/sidebar-provider";
import { useUIState } from "@/hooks/use-ui-state";
import { AppMain } from "./app-main";

const Assistant: FC = () => {
  const [uiState, setUIState] = useUIState();
  const sidebarRuntime = useChatRuntime();

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <AssistantRuntimeProvider runtime={sidebarRuntime}>
          <AppSidebar />
          <MobileSidebarTrigger />
        </AssistantRuntimeProvider>
        <AppMain />
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
