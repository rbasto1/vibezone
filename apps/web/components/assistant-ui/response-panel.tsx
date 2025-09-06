import type { PanelConfig } from "@/app/assistant";
import { Thread } from "@/components/assistant-ui/thread";
import { useRuntimeRegistration } from "@/hooks/use-response-registration";
import { getGlobalAssistantCloud } from "@/lib/assistant-cloud/provider";
import { authClient } from "@/lib/auth-client";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";
import { type FC } from "react";
import { toast } from "sonner";
import { PanelHeader } from "./response-panel-header";
import { ThreadScrollToBottom } from "./thread-scroll-to-bottom";

interface ResponsePanelProps {
  panel: PanelConfig;
  onClose?: () => void;
  onChangeModel: (providerId: string, modelId: string) => void;
}

// Since we can't use ModelContextProviders (see comment below), we will
// have to hack our way out
const panelGlobalContext: Record<string, PanelConfig> = {};

export const ResponsePanel: FC<ResponsePanelProps> = ({
  panel,
  onClose,
  onChangeModel,
}) => {
  const { id, model } = panel;
  panelGlobalContext[id] = panel;
  const { data: session } = authClient.useSession();
  const token = session?.session.token;
  const userId = session?.user.id;

  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/stream`,
      fetch: (url, init) => {
        if (!panelGlobalContext[id]) {
          // TODO: use sonner for a better UX
          throw new Error("Assert: Panel not registered!");
        }
        const { model } = panelGlobalContext[id];
        return fetch(url, {
          ...init,
          headers: {
            ...init?.headers,
            "x-vz-model-id": model,
          },
        });
      },
    }),
    cloud: token && userId ? getGlobalAssistantCloud(token, userId) : undefined,
  });

  // We will update the runtime using the global variable above
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // const runtime = useMemo(() => _runtime, []);

  // Commented out for us to check later if it gets to work
  // useEffect(() => {
  //   // This is not working as of assitant-ui@0.10.43
  //   return runtime.registerModelContextProvider({
  //     getModelContext: (): ModelContext => {
  //       console.info("Yay! It works! Called getModelContext:", id, model);
  //       return {};
  //     },
  //   });
  // }, [runtime, model, id]);

  // This is how we execute the chat from the global composer
  // It registers the runtime so that messages sent from the composer are sent to this panel's runtime
  useRuntimeRegistration(id, runtime);

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden h-full">
      <PanelHeader
        modelId={model}
        onClose={onClose}
        onChangeModel={onChangeModel}
        onStop={() => {
          try {
            runtime.thread.cancelRun();
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            toast.error(`Failed to stop: ${message}`);
          }
        }}
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
