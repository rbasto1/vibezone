"use client";

import {
  createMessageFromAppend,
  sliceUiMessagesUntil,
  toThreadMessages,
  toUiMessages,
} from "@/lib/assistant-ui/message-converters";
import { useChat, type UIMessage } from "@ai-sdk/react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import {
  useExternalStoreRuntime,
  type AssistantRuntime,
} from "@assistant-ui/react";
import type { DefaultChatTransport } from "ai";
import { startTransition, useCallback, useEffect } from "react";
import { useAttachmentAdapter } from "./use-attachments";
import { useThreadMessages } from "./use-thread-store";

interface UseThreadRuntimeParams {
  threadId: string;
  initialMessages?: ThreadMessageLike[];
  transport: DefaultChatTransport<UIMessage>;
  onFinish?: () => void;
  onError?: (error: Error) => void;
  modelId: string;
}

interface MetadataWithOptionalCustom extends Record<string, unknown> {
  custom?: Record<string, unknown>;
}

export const useThreadRuntime = ({
  threadId,
  initialMessages,
  transport,
  onFinish,
  onError,
  modelId,
}: UseThreadRuntimeParams): AssistantRuntime => {
  const [messages, setMessages] = useThreadMessages(threadId);
  const attachmentAdapter = useAttachmentAdapter();

  const chat = useChat<UIMessage>({
    id: threadId,
    messages: toUiMessages(
      messages.length ? messages : (initialMessages ?? [])
    ),
    transport,
    onFinish: () => {
      onFinish?.();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        onError?.(error);
      } else {
        onError?.(new Error(JSON.stringify(error)));
      }
    },
  });

  useEffect(() => {
    if (!messages.length && initialMessages?.length) {
      setMessages(initialMessages);
      chat.setMessages(toUiMessages(initialMessages));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startTransition(() => setMessages(toThreadMessages(chat.messages)));
  }, [chat.messages, setMessages]);

  const applyLatestAssistantMetadata = useCallback(
    (
      updater: (
        current: Record<string, unknown>
      ) => Record<string, unknown>,
    ) => {
      const currentMessages = chat.messages;
      if (!currentMessages.length) {
        return;
      }

      const nextMessages = [...currentMessages];
      for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
        const candidate = nextMessages[index];
        if (candidate.role !== "assistant") {
          continue;
        }

        const metadata = (candidate.metadata as MetadataWithOptionalCustom) ?? {};
        const currentCustom = metadata.custom ?? {};
        const nextCustom = updater(currentCustom);
        nextMessages[index] = {
          ...candidate,
          metadata: {
            ...metadata,
            custom: nextCustom,
          },
        } as UIMessage;
        chat.setMessages(nextMessages);
        break;
      }
    },
    [chat]
  );

  const runWithTiming = useCallback(
    async (operation: () => Promise<void>) => {
      const startTime = Date.now();
      try {
        await operation();
        const duration = Date.now() - startTime;
        applyLatestAssistantMetadata((currentCustom) => ({
          ...currentCustom,
          modelId,
          duration,
        }));
      } catch (error) {
        applyLatestAssistantMetadata((currentCustom) => ({
          ...currentCustom,
          modelId,
        }));
        throw error;
      }
    },
    [applyLatestAssistantMetadata, modelId]
  );

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    isRunning: chat.status === "streaming" || chat.status === "submitted",
    convertMessage: (message) => message,
    setMessages: (nextMessages) => {
      const nextArray = Array.from(nextMessages);
      setMessages(nextArray);
      chat.setMessages(toUiMessages(nextArray));
    },
    onNew: async (message) => {
      const uiMessage = createMessageFromAppend(message);
      await runWithTiming(() =>
        chat.sendMessage(uiMessage, {
          metadata: message.runConfig,
        })
      );
    },
    onEdit: async (message) => {
      const trimmedMessages = sliceUiMessagesUntil(
        chat.messages,
        message.parentId
      );
      chat.setMessages(trimmedMessages);
      const uiMessage = createMessageFromAppend(message);
      await runWithTiming(() =>
        chat.sendMessage(uiMessage, {
          metadata: message.runConfig,
        })
      );
    },
    onReload: async (parentId, config) => {
      const trimmedMessages = sliceUiMessagesUntil(chat.messages, parentId);
      chat.setMessages(trimmedMessages);
      await runWithTiming(() =>
        chat.regenerate({ metadata: config.runConfig })
      );
    },
    onCancel: () => chat.stop(),
    adapters: {
      attachments: attachmentAdapter,
    },
  });

  return runtime;
};
