import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";

import { AppSidebar } from "@/components/app-sidebar";
import { authClient } from "@/lib/auth-client";
import type { FC } from "react";

export function AppSidebarLoader() {
  const { data: session } = authClient.useSession();

  if (!session?.user) {
    return <AppSidebarWithAnon />;
  }
  return (
    <AppSidebarWithRuntime
      token={session.session.token}
      userId={session.user.id}
    />
  );
}

interface AppSidebarWithRuntimeProps {
  token: string;
  userId: string;
}

const AppSidebarWithRuntime: FC<AppSidebarWithRuntimeProps> = ({
  token,
  userId,
}) => {
  // Runtime for the sidebar components (e.g., ThreadList) that require context
  // TODO: refactor this, we have to list threads from a global list
  const sidebarRuntime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/stream`,
      body: {
        config: {
          model: "gpt-4o-mini",
        },
      },
    }),
    cloud: new AssistantCloud({
      baseUrl: "http://localhost:3022",
      apiKey: token,
      userId,
      workspaceId: "",
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
