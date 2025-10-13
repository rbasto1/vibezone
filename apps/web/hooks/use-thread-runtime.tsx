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
import { useEffect } from "react";
import { useAttachmentAdapter } from "./use-attachments";
import { useThreadMessages } from "./use-thread-store";

interface UseThreadRuntimeParams {
  threadId: string;
  initialMessages?: ThreadMessageLike[];
  transport: DefaultChatTransport<UIMessage>;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}

export const useThreadRuntime = ({
  threadId,
  initialMessages,
  transport,
  onFinish,
  onError,
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
    setMessages(toThreadMessages(chat.messages));
  }, [chat.messages, setMessages]);

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
      await chat.sendMessage(uiMessage, {
        metadata: message.runConfig,
      });
    },
    onEdit: async (message) => {
      const trimmedMessages = sliceUiMessagesUntil(
        chat.messages,
        message.parentId
      );
      chat.setMessages(trimmedMessages);
      const uiMessage = createMessageFromAppend(message);
      await chat.sendMessage(uiMessage, {
        metadata: message.runConfig,
      });
    },
    onReload: async (parentId, config) => {
      const trimmedMessages = sliceUiMessagesUntil(chat.messages, parentId);
      chat.setMessages(trimmedMessages);
      await chat.regenerate({ metadata: config.runConfig });
    },
    onCancel: () => chat.stop(),
    adapters: {
      attachments: attachmentAdapter,
    },
  });

  return runtime;
};
