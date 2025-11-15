"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import {
  useExternalStoreRuntime,
  type AssistantRuntime,
} from "@assistant-ui/react";
import type {
  ChatOnErrorCallback,
  ChatOnFinishCallback,
  DefaultChatTransport,
} from "ai";
import { startTransition, useCallback, useEffect } from "react";

import {
  createMessageFromAppend,
  sliceUiMessagesUntil,
  toThreadMessages,
  toUiMessages,
} from "@/lib/assistant-ui/message-converters";
import { useAttachmentAdapter } from "./use-attachments";
import { useStableValue } from "./use-stable-value";
import { useThreadMessages } from "./use-thread-messages";

interface UseThreadRuntimeParams {
  threadId: string;
  initialMessages?: ThreadMessageLike[];
  transport: DefaultChatTransport<UIMessage>;
  onFinish?: ChatOnFinishCallback<UIMessage>;
  onError?: ChatOnErrorCallback;
}

interface UseThreadRuntimeResult {
  runtime: AssistantRuntime;
  syncMessages: (messages: ThreadMessageLike[]) => void;
}

export const useThreadRuntime = ({
  threadId,
  initialMessages,
  transport,
  onFinish,
  onError,
}: UseThreadRuntimeParams): UseThreadRuntimeResult => {
  const [messages, setThreadMessages] = useThreadMessages(threadId);
  const attachmentAdapter = useAttachmentAdapter();

  const chat = useChat<UIMessage>({
    id: threadId,
    messages: toUiMessages(
      messages.length ? messages : (initialMessages ?? [])
    ),
    transport,
    onFinish,
    onError,
  });
  const chatStable = useStableValue(chat);

  useEffect(() => {
    if (!messages.length && initialMessages?.length) {
      setThreadMessages(initialMessages);
      chatStable.current.setMessages(toUiMessages(initialMessages));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatStable]);

  useEffect(() => {
    startTransition(() => setThreadMessages(toThreadMessages(chat.messages)));
  }, [chat.messages, setThreadMessages]);

  const syncMessages = useCallback(
    (next: ThreadMessageLike[]) => {
      setThreadMessages(next);
      chatStable.current.setMessages(toUiMessages(next));
    },
    [chatStable, setThreadMessages]
  );

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    isRunning: chat.status === "streaming" || chat.status === "submitted",
    convertMessage: (message) => message,
    setMessages: (nextMessages) => {
      const nextArray = Array.from(nextMessages);
      syncMessages(nextArray);
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

  return { runtime, syncMessages };
};
