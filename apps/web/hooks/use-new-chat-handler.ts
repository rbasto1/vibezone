import { generateId } from "ai";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { useNewChat } from "@/hooks/use-chat";
import {
  usePanelsConfigSetter,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useThreadRuntimeControllersValue } from "@/hooks/use-thread-store";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import { generateThreadId } from "@/lib/id";
import type { PanelConfig } from "@/store/panels";
import { threadMessagesAtom } from "@/store/thread-messages";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { useSetAtom } from "jotai";

export function useNewChatHandler() {
  const t = useTranslations();
  const createNewChat = useNewChat();
  const setPanelsState = usePanelsStateSetter();
  const setPanelsConfig = usePanelsConfigSetter();
  const setUIState = useUIStateSetter();
  const preferences = useUserPreferencesValue();
  const runtimeControllers = useThreadRuntimeControllersValue();
  const setThreadMessages = useSetAtom(threadMessagesAtom);

  const systemPrompt = preferences.changedPrompt
    ? preferences.systemPrompt
    : t("Prompts.system");

  const buildSystemMessages = useCallback(() => {
    if (!systemPrompt) return [] as ThreadMessageLike[];
    return [
      {
        id: generateId(),
        role: "system" as const,
        createdAt: new Date(),
        content: [
          {
            type: "text" as const,
            text: systemPrompt,
          },
        ],
        metadata: { custom: {} },
      } satisfies ThreadMessageLike,
    ];
  }, [systemPrompt]);

  return useCallback(() => {
    createNewChat();

    for (const controller of Object.values(runtimeControllers)) {
      controller.runtime.thread.reset();
    }

    setPanelsState({});
    const nextThreadMessages: Record<string, ThreadMessageLike[]> = {};
    setPanelsConfig((config) =>
      config.map((panel, order) => {
        const id = generateThreadId(order);
        const initialMessages = buildSystemMessages();
        nextThreadMessages[id] = initialMessages;
        return {
          id,
          provider: panel.provider,
          model: panel.model,
          initialMessages,
        } satisfies PanelConfig;
      })
    );
    setThreadMessages(nextThreadMessages);

    setUIState({ panelOpen: null, suggestionsUsed: false });
  }, [
    buildSystemMessages,
    createNewChat,
    runtimeControllers,
    setPanelsConfig,
    setPanelsState,
    setThreadMessages,
    setUIState,
  ]);
}
