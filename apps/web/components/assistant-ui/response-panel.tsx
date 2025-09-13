import { Thread } from "@/components/assistant-ui/thread";
import { useCurrentChatSetter } from "@/hooks/use-chat";
import { usePanelState } from "@/hooks/use-panels";
import { useRuntimeRegistration } from "@/hooks/use-response-registration";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import type { ChatOnFinishCallback, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { type FC } from "react";
import { toast } from "sonner";
import { PanelHeader } from "./response-panel-header";
import { ThreadScrollToBottom } from "./thread-scroll-to-bottom";

interface ResponsePanelProps {
  panel: PanelConfig;
}

// Since we can't use ModelContextProviders (see comment below), we will
// have to hack our way out
const panelGlobalContext: Record<string, PanelConfig> = {};

export const ResponsePanel: FC<ResponsePanelProps> = ({ panel }) => {
  const { id, model } = panel;
  panelGlobalContext[id] = panel;
  const [panelState, setPanelState] = usePanelState();
  const setCurrentChat = useCurrentChatSetter();
  const renameChatMutation = trpc.chats.renameChat.useMutation();

  const handleModelError = (error: Error) => {
    setPanelState(id, (currentState) => ({
      ...currentState,
      error,
      running: false,
    }));
  };

  const handleModelFinish: ChatOnFinishCallback<UIMessage> = async () => {
    setPanelState(id, (currentState) => ({
      ...currentState,
      running: false,
    }));

    // marks the chat as fetched, to prevent multiple calls to the backend
    setCurrentChat((currentChat) => ({ ...currentChat, fetchedTitle: true }));
    // use the setter to have access to the current chat
    setCurrentChat((currentChat) => {
      const firstUserMessage = currentChat.firstUserMessage;
      if (!firstUserMessage) {
        console.warn("No first user message found");
        return currentChat;
      }

      // our backend will generate the title based on the conversation history
      renameChatMutation
        .mutateAsync({
          chatId: currentChat.id,
          title: null,
          firstUserMessage,
        })
        .then((chat) => {
          if (!chat.success) {
            console.warn("Failed to rename chat", chat.message);
            return;
          }
          // this happens after the mutation is successful, asynchronously
          setCurrentChat((currentChat) => ({
            ...currentChat,
            title: chat.title,
          }));
        });

      // this is just to satisfy the hook
      return currentChat;
    });
  };

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
    onError: handleModelError,
    onFinish: handleModelFinish,
    messages: panel.initialMessages,
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

  const handleStop = () => {
    try {
      runtime.thread.cancelRun();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to stop: ${message}`);
    }
  };

  const { running, error } = panelState(id);

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden h-full">
      <PanelHeader
        panelId={id}
        modelId={model}
        onStop={running ? handleStop : undefined}
      />
      <div className="flex-1 min-h-0">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread panelId={id} modelId={model} error={error} />
          <ThreadScrollToBottom />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
};
