import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";

import { AppSidebar } from "@/components/app-sidebar";
import { useSession } from "@/hooks/use-session";
import type { FC } from "react";

export function AppSidebarLoader() {
  const auth = useSession();

  if (!auth?.user) {
    return <AppSidebarWithAnon />;
  }

  return <AppSidebarWithRuntime />;
}

const AppSidebarWithRuntime: FC = () => {
  // Runtime for the sidebar components (e.g., ThreadList) that require context
  const sidebarRuntime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/stream`,
      body: {
        config: {
          model: "gpt-4o-mini",
        },
      },
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={sidebarRuntime}>
      <AppSidebar />
    </AssistantRuntimeProvider>
  );
};

const AppSidebarWithAnon: FC = () => {
  const sidebarRuntime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/stream`,
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={sidebarRuntime}>
      <AppSidebar />
    </AssistantRuntimeProvider>
  );
};
