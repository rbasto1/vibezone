import type { PanelConfig } from "@/app/assistant";
import { Thread } from "@/components/assistant-ui/thread";
import { useRuntimeRegistration } from "@/hooks/use-response-registration";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";
import type { FC } from "react";
import { PanelHeader } from "./response-panel-header";
import { ThreadScrollToBottom } from "./thread-scroll-to-bottom";

interface ResponsePanelProps {
  panel: PanelConfig;
  onClose?: () => void;
  onChangeModel: (providerId: string, modelId: string) => void;
}

export const ResponsePanel: FC<ResponsePanelProps> = ({
  panel,
  onClose,
  onChangeModel,
}) => {
  const { id, provider, model, temperature } = panel;
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/stream`,
      body: {
        config: {
          provider,
          model,
          temperature: temperature ?? 0.1,
        },
      },
    }),
  });

  // This is how we execute the chat from the global composer
  // It registers the runtime so that messages sent from the composer are sent to this panel's runtime
  useRuntimeRegistration(id, runtime);

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden h-full">
      <PanelHeader
        modelId={model}
        onClose={onClose}
        onChangeModel={onChangeModel}
      />
      <div className="flex-1 min-h-0">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread />
          <ThreadScrollToBottom />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
};
