import { Thread } from "@/components/assistant-ui/thread";
import { cn } from "@/components/ui/utils";
import { useAttachmentAdapter } from "@/hooks/use-attachments";
import { useCurrentChatSetter } from "@/hooks/use-chat";
import { usePanelState } from "@/hooks/use-panels";
import { useRuntimeRegistration } from "@/hooks/use-response-registration";
import { useSession } from "@/hooks/use-session";
import { generateFingerprint } from "@/lib/limiting";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import type { ChatOnFinishCallback, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { Maximize2, Minimize2 } from "lucide-react";
import { useRef, type FC } from "react";
import { toast } from "sonner";
import { PanelHeader } from "./response-panel-header";
import { ThreadScrollToBottom } from "./thread-scroll-to-bottom";

interface ResponsePanelProps {
  panel: PanelConfig;
  className?: string;
  isFocused?: boolean;
  onToggleFocus?: () => void;
}

// Since we can't use ModelContextProviders (see comment below), we will
// have to hack our way out
const panelGlobalContext: Record<string, PanelConfig> = {};

export const ResponsePanel: FC<ResponsePanelProps> = ({
  panel,
  className,
  isFocused = false,
  onToggleFocus,
}) => {
  const { id } = panel;
  panelGlobalContext[id] = panel;
  const [panelState, setPanelState] = usePanelState();
  const setCurrentChat = useCurrentChatSetter();
  const attachmentAdapter = useAttachmentAdapter();
  const renameChatMutation = trpc.chats.renameChat.useMutation();
  const session = useSession();
  const sessionToken = useRef(session?.session.token);
  sessionToken.current = session?.session.token;

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

    // give it a time and then save the messages, no need to rush all panels at the same time
    setTimeout(() => {
      setPanelState(id, (currentState) => ({
        ...currentState,
        dirty: true,
      }));
    }, 2000);

    // use the setter to have access to the current chat
    setCurrentChat((currentChat) => {
      if (currentChat.fetchedTitlePanelId) {
        // chat was fetched or is being fetched by another panel
        return currentChat;
      }

      // marks the chat as fetched by us, to prevent multiple calls to the backend
      setCurrentChat({
        ...currentChat,
        fetchedTitlePanelId: id,
      });

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

      // make sure not to overwrite the fetched title panel id with empty value
      return { ...currentChat, fetchedTitlePanelId: id };
    });
  };

  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/stream`,
      fetch: (url, init) => {
        if (!panelGlobalContext[id]) {
          toast.error("Assert: Panel not registered!");
          return Promise.resolve(
            new Response("Application error, please refresh the page", {
              status: 400,
            })
          );
        }
        const { model } = panelGlobalContext[id];
        return generateFingerprint(sessionToken.current).then((authorization) =>
          fetch(url, {
            ...init,
            headers: {
              ...init?.headers,
              "x-vz-model-id": model,
              authorization,
            },
          })
        );
      },
    }),
    onError: handleModelError,
    onFinish: handleModelFinish,
    messages: panel.initialMessages,
    adapters: {
      attachments: attachmentAdapter,
    },
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

  const FocusIcon = isFocused ? Minimize2 : Maximize2;
  const focusButtonLabel = isFocused ? "Exit focus view" : "Focus this panel";

  return (
    <div
      className={cn(
        "group relative flex flex-col border rounded-lg overflow-hidden h-full transition-all duration-300",
        isFocused && "ring-1 ring-primary/40 shadow-lg",
        className
      )}
    >
      {onToggleFocus && (
        <button
          type="button"
          onClick={onToggleFocus}
          aria-pressed={isFocused}
          aria-label={focusButtonLabel}
          title={focusButtonLabel}
          className={cn(
            "absolute right-2 bottom-2 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border/40 bg-background/70 text-foreground/80 backdrop-blur transition-opacity cursor-pointer",
            isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <FocusIcon className="h-4 w-4" />
        </button>
      )}
      <PanelHeader panel={panel} onStop={running ? handleStop : undefined} />
      <div className="flex-1 min-h-0">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread panel={panel} error={error} />
          <ThreadScrollToBottom />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
};
