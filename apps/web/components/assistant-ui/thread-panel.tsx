"use client";

import {
  AssistantRuntimeProvider,
  type AssistantRuntime,
} from "@assistant-ui/react";
import type { MessageMetadata } from "@vibezone/database";
import type { ChatOnFinishCallback, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { Maximize2, Minimize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type FC,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import z from "zod";

import { Thread } from "@/components/assistant-ui/thread";
import { cn } from "@/components/ui/utils";
import { useAnonQuotaSetter } from "@/hooks/use-anon-quota";
import { useAssistantMessageSaver } from "@/hooks/use-assistant-message-saver";
import { useAuthSession } from "@/hooks/use-auth-session";
import { canReason } from "@/hooks/use-capabilities";
import {
  captchaToken,
  useCaptchaFailed,
  useCaptchaRequested,
  useCaptchaStateValue,
} from "@/hooks/use-captcha";
import { usePanelState } from "@/hooks/use-panels";
import { useStableValue } from "@/hooks/use-stable-value";
import { useThreadRuntime } from "@/hooks/use-thread-runtime";
import { useThreadRuntimeControllerSetter } from "@/hooks/use-thread-store";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import {
  convertAISDKAssistantMessageToMessageState,
  isUiMessageArray,
  sanitizeMessagesForRequest,
} from "@/lib/assistant-ui/message-converters";
import { safeParse } from "@/lib/json";
import { generateFingerprint } from "@/lib/limiting";
import type { PanelConfig } from "@/store/panels";
import { PanelHeader } from "./response-panel-header";

interface ResponsePanelProps {
  panel: PanelConfig;
  className?: string;
  isFocused?: boolean;
  onToggleFocus?: () => void;
  focusSwitchButtons?: ReactNode;
}

// Since we can't use ModelContextProviders (see comment below), we will
// have to hack our way out
const panelGlobalContext: Record<string, PanelConfig> = {};

export const ThreadPanel: FC<ResponsePanelProps> = ({
  panel,
  className,
  isFocused = false,
  onToggleFocus,
  focusSwitchButtons,
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
  const sessionId = useAuthSession();
  const userPreferences = useUserPreferencesValue();
  const setAnonQuota = useAnonQuotaSetter();
  const setCaptchaFailed = useCaptchaFailed();
  const setCaptchaRequested = useCaptchaRequested();
  const captchaState = useCaptchaStateValue();
  const setRuntimeController = useThreadRuntimeControllerSetter();
  const runtimeRef = useRef<AssistantRuntime | null>(null);

  const sessionToken = useStableValue(sessionId ?? undefined);

  const panelCanReason = canReason(panel.model);
  const panelNotRegisteredMessage = t("panelNotRegistered");
  const transportErrorMessage = t("transportError");
  const reasoningEffort =
    userPreferences.reasoningEffort === "none"
      ? "low"
      : userPreferences.reasoningEffort;
  const plugins = useStableValue({
    web: userPreferences.webSearch,
    reason: panelCanReason ? reasoningEffort : "low",
  });

  // This callback function is never reload by the runtime provider, so any initial value of variables
  // in its scope will be valid for the duration of the app. That's why we need stable values (refs).
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

      throw error;
    },
    [
      captchaState.execution,
      setCaptchaFailed,
      setCaptchaRequested,
      setPanelState,
    ]
  );

  const saveAssistantMessage = useAssistantMessageSaver();
  const saveAssistantMessageRef = useStableValue(saveAssistantMessage);

  const handleModelFinish: ChatOnFinishCallback<UIMessage> = ({
    message,
    messages,
    isError,
    isDisconnect,
    isAbort,
  }) => {
    const saveAssistantMessage = saveAssistantMessageRef.current;
    const metadata = message.metadata as MessageMetadata;
    const modelId = metadata?.custom?.modelId ?? panelGlobalContext[id]?.model;
    if (!modelId) {
      toast.error("Could not save response, model not detected");
      return;
    }

    const messageState = convertAISDKAssistantMessageToMessageState(
      message,
      messages,
      {
        isError,
        isDisconnect,
        isAbort,
      }
    );

    saveAssistantMessage(messageState, id, modelId);

    setPanelState((currentState) => ({
      ...currentState,
      running: false,
      hasMessages: true,
    }));
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
        prepareSendMessagesRequest: ({
          body,
          messages,
          id: chatId,
          trigger,
          messageId,
        }) => {
          const sanitizedMessages = sanitizeMessagesForRequest(messages);
          const baseBody: Record<string, unknown> = body ? { ...body } : {};
          const existingMessages = (
            baseBody as {
              messages?: unknown;
            }
          ).messages;
          const bodyMessages = isUiMessageArray(existingMessages)
            ? sanitizeMessagesForRequest(existingMessages)
            : sanitizedMessages;

          return {
            body: {
              ...baseBody,
              id: chatId,
              trigger,
              messageId,
              messages: bodyMessages,
            },
          };
        },
      }),
    [
      id,
      panelNotRegisteredMessage,
      transportErrorMessage,
      setAnonQuota,
      sessionToken,
      handleModelError,
      plugins,
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

  // This model context provider seem to apply only to tool calls.
  // Commented out for us to check later if it gets to work for other calls as well.
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
        "group relative flex flex-col overflow-hidden h-full transition-all duration-300",
        className
      )}
    >
      {focusSwitchButtons && (
        <div className="pointer-events-none absolute right-3 top-3 z-30 flex flex-wrap justify-end gap-2">
          <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
            {focusSwitchButtons}
          </div>
        </div>
      )}
      <PanelHeader panel={panel} onStop={running ? handleStop : undefined} />
      <div className="flex-1 min-h-0">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread panel={panel} error={error} />
        </AssistantRuntimeProvider>
      </div>
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
    </div>
  );
};
