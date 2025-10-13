"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { cn } from "@/components/ui/utils";
import { useAnonQuotaSetter } from "@/hooks/use-anon-quota";
import { useAllCanReason } from "@/hooks/use-capabilities";
import {
  captchaToken,
  useCaptchaFailed,
  useCaptchaRequested,
  useCaptchaStateValue,
} from "@/hooks/use-captcha";
import { useCurrentChatSetter } from "@/hooks/use-chat";
import { useComposerPromptSetter } from "@/hooks/use-composer-prompt";
import { usePanelState } from "@/hooks/use-panels";
import { useThreadRuntime } from "@/hooks/use-thread-runtime";
import { useThreadRuntimeControllerSetter } from "@/hooks/use-thread-store";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import { safeParse } from "@/lib/json";
import { generateFingerprint } from "@/lib/limiting";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import {
  AssistantRuntimeProvider,
  type AssistantRuntime,
} from "@assistant-ui/react";
import { useAuth } from "@clerk/nextjs";
import { DefaultChatTransport } from "ai";
import { Maximize2, Minimize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, type FC } from "react";
import { toast } from "sonner";
import z from "zod";
import { PanelHeader } from "./response-panel-header";

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
  const t = useTranslations("ResponsePanel");
  const { id } = panel;
  panelGlobalContext[id] = panel;
  useEffect(() => {
    return () => {
      delete panelGlobalContext[id];
    };
  }, [id]);
  const [panelState, setPanelState] = usePanelState(id);
  const setCurrentChat = useCurrentChatSetter();
  const renameChatMutation = trpc.chats.renameChat.useMutation();
  const session = useAuth();
  const sessionToken = useRef(session?.userId ?? undefined); // TODO: use session token
  sessionToken.current = session?.userId ?? undefined;
  const panelNotRegisteredMessage = t("panelNotRegistered");
  const transportErrorMessage = t("transportError");
  const userPreferences = useUserPreferencesValue();
  const plugins = useRef({
    web: userPreferences.pluginWeb,
    reason: userPreferences.reasoningEffort,
  });
  const allCanReason = useAllCanReason();
  const setAnonQuota = useAnonQuotaSetter();
  const setCaptchaFailed = useCaptchaFailed();
  const setCaptchaRequested = useCaptchaRequested();
  const captchaState = useCaptchaStateValue();
  const setGlobalPrompt = useComposerPromptSetter();
  const setRuntimeController = useThreadRuntimeControllerSetter();
  const runtimeRef = useRef<AssistantRuntime | null>(null);

  plugins.current = {
    web: userPreferences.pluginWeb,
    reason: allCanReason ? userPreferences.reasoningEffort : "low",
  };

  const handleModelError = useCallback(
    async (error: Error) => {
      console.warn("Stream error:", error);
      const message = error.message;
      const json = safeParse(message, z.object({ code: z.string() }));

      if (json?.code === "CAPTCHA") {
        setCaptchaFailed();
        setPanelState((currentState) => ({
          ...currentState,
          running: false,
        }));

        setCaptchaRequested();
        await captchaState.execution.promise;
        captchaState.execution.reset();
      } else {
        setPanelState((currentState) => ({
          ...currentState,
          error,
          running: false,
        }));
      }

      // reset the state to before sending
      const runtimeInstance = runtimeRef.current;
      if (runtimeInstance) {
        const parcel = runtimeInstance.thread.export();
        const messages = parcel.messages;
        if (messages.at(-1)?.message?.status?.type === "running") {
          messages.pop();
        }
        const lastMessage = messages.pop();
        if (lastMessage?.message.role === "user") {
          if (messages.length) {
            // TODO: import messages, but this .import is not working
            // runtimeInstance.thread.import({ ...parcel, messages });
          }
          const text = lastMessage.message.content.find(
            (c) => c.type === "text"
          )?.text;
          if (text) {
            setGlobalPrompt(text);
          }
          const hadAttachments = lastMessage.message.content.some(
            (c) => c.type !== "text"
          );
          toast.warning(
            hadAttachments
              ? `Model ${panel.model} failed, please attach the files and submit your message to try again`
              : `Model ${panel.model} failed, please submit your message to try again`
          );
        }
      }

      throw error;
    },
    [
      captchaState.execution,
      panel.model,
      setCaptchaFailed,
      setCaptchaRequested,
      setGlobalPrompt,
      setPanelState,
    ]
  );

  const handleModelFinish = async () => {
    setPanelState((currentState) => ({
      ...currentState,
      running: false,
    }));

    // give it a time and then save the messages, no need to rush all panels at the same time
    setTimeout(() => {
      setPanelState((currentState) => ({
        ...currentState,
        dirty: true,
        hasMessages: true,
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

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/stream`,
        fetch: (url, init) => {
          if (!panelGlobalContext[id]) {
            toast.error(panelNotRegisteredMessage);
            return Promise.resolve(
              new Response(transportErrorMessage, {
                status: 400,
              })
            );
          }

          if (!captchaToken) {
            toast.error("Captcha validation failed");
            return Promise.resolve(
              new Response(transportErrorMessage, {
                status: 400,
              })
            );
          }

          const { model } = panelGlobalContext[id];
          const { web, reason } = plugins.current;
          const pluginList = [];
          if (web) pluginList.push("web");
          pluginList.push(`reason-${reason}`);
          const modelSpecifier = pluginList.length
            ? `${model}#${pluginList.join(",")}`
            : model;
          const cfTurnstileResponse = captchaToken;

          return generateFingerprint(sessionToken.current).then(
            (authorization) =>
              fetch(url, {
                ...init,
                headers: {
                  ...init?.headers,
                  "x-vz-model-id": modelSpecifier,
                  "cf-turnstile-response": cfTurnstileResponse,
                  authorization,
                },
              })
                .then((response) => {
                  const remainingQuota =
                    response.headers.get("X-Remaining-Quota");
                  if (remainingQuota) {
                    setAnonQuota(Number(remainingQuota));
                  }
                  return response;
                })
                .catch(handleModelError)
          );
        },
      }),
    [
      id,
      panelNotRegisteredMessage,
      transportErrorMessage,
      setAnonQuota,
      handleModelError,
    ]
  );

  const runtime = useThreadRuntime({
    threadId: id,
    initialMessages: panel.initialMessages,
    transport,
    onFinish: handleModelFinish,
    onError: handleModelError,
  });
  runtimeRef.current = runtime;

  useEffect(() => {
    setRuntimeController(id, {
      runtime,
      append: (message) => runtime.thread.append(message),
      cancel: () => runtime.thread.cancelRun(),
    });
    return () => {
      setRuntimeController(id, null);
    };
  }, [runtime, id, setRuntimeController]);

  // We will update the runtime using the global variable above
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // const runtime = useMemo(() => _runtime, []);

  // Commented out for us to check later if it gets to work
  // useEffect(() => {
  //   // This is not working as of assitant-ui/react@0.11.28
  //   return runtime.registerModelContextProvider({
  //     getModelContext: (): ModelContext => {
  //       console.info("Yay! It works! Called getModelContext:", id);
  //       return {};
  //     },
  //   });
  // }, [runtime, id]);

  // This is how we execute the chat from the global composer
  // It registers the runtime so that messages sent from the composer are sent to this panel's runtime
  const handleStop = () => {
    try {
      runtime.thread.cancelRun();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(
        t("stopFailed", {
          message,
        })
      );
    }
  };

  const { running, error } = panelState;

  const FocusIcon = isFocused ? Minimize2 : Maximize2;
  const focusButtonLabel = isFocused ? t("exitFocus") : t("focusPanel");

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
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
};
