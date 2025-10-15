import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

import { AppSidebar } from "@/components/app-sidebar";

export function AppSidebarLoader() {
  const sidebarRuntime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={sidebarRuntime}>
      <AppSidebar />
    </AssistantRuntimeProvider>
  );
}
