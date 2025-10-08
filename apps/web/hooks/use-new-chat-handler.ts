import { generateId } from "ai";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { useNewChat } from "@/hooks/use-chat";
import {
  usePanelsConfigSetter,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useRuntimes } from "@/hooks/use-response-registration";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import { generateThreadId } from "@/lib/id";
import type { PanelConfig } from "@/store/panels";

export function useNewChatHandler() {
  const t = useTranslations();
  const createNewChat = useNewChat();
  const getRuntimes = useRuntimes();
  const setPanelsState = usePanelsStateSetter();
  const setPanelsConfig = usePanelsConfigSetter();
  const setUIState = useUIStateSetter();
  const preferences = useUserPreferencesValue();

  const systemPrompt = preferences.changedPrompt
    ? preferences.systemPrompt
    : t("Prompts.system");

  return useCallback(() => {
    createNewChat();

    if (!getRuntimes) return;

    const runtimes = getRuntimes();
    for (const runtime of runtimes.values()) {
      runtime.thread.reset();
    }

    setPanelsState({});
    setPanelsConfig((config) =>
      config.map(
        (c, order) =>
          ({
            id: generateThreadId(order),
            provider: c.provider,
            model: c.model,
            initialMessages: systemPrompt
              ? [
                  {
                    id: generateId(),
                    role: "system",
                    parts: [
                      {
                        type: "text",
                        text: systemPrompt,
                      },
                    ],
                  },
                ]
              : [],
          }) satisfies PanelConfig
      )
    );

    setUIState({ panelOpen: null, suggestionsUsed: false });
  }, [
    createNewChat,
    getRuntimes,
    setPanelsConfig,
    setPanelsState,
    setUIState,
    systemPrompt,
  ]);
}
