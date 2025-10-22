import { generateId } from "ai";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { useNewChat } from "@/hooks/use-chat";
import {
  usePanelsConfigSetter,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useProjectsValue } from "@/hooks/use-projects";
import { useThreadRuntimeControllersValue } from "@/hooks/use-thread-store";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import { generateThreadId } from "@/lib/id";
import type { PanelConfig } from "@/store/panels";
import { threadMessagesAtom } from "@/store/thread-messages";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { useSetAtom } from "jotai";

interface NewChatOptions {
  projectId?: string | null;
  projectInstructions?: string | null;
}

export function useNewChatHandler() {
  const t = useTranslations();
  const createNewChat = useNewChat();
  const setPanelsState = usePanelsStateSetter();
  const setPanelsConfig = usePanelsConfigSetter();
  const setUIState = useUIStateSetter();
  const projects = useProjectsValue();
  const preferences = useUserPreferencesValue();
  const runtimeControllers = useThreadRuntimeControllersValue();
  const setThreadMessages = useSetAtom(threadMessagesAtom);

  const systemPrompt = preferences.changedPrompt
    ? preferences.systemPrompt
    : t("Prompts.system");

  const defaultProject = useMemo(
    () => projects.find((project) => project.isDefault) ?? projects[0] ?? null,
    [projects]
  );

  return useCallback(
    (options?: NewChatOptions) => {
      const targetProject = options?.projectId
        ? (projects.find((project) => project.id === options.projectId) ?? null)
        : defaultProject;

      const targetProjectId = targetProject?.id ?? options?.projectId ?? null;

      const mergedPrompt = mergePrompts(
        systemPrompt,
        options?.projectInstructions ?? targetProject?.instructions ?? null
      );

      const chat = createNewChat(targetProjectId);

      for (const controller of Object.values(runtimeControllers)) {
        controller.runtime.thread.reset();
      }

      setPanelsState({});
      const nextThreadMessages: Record<string, ThreadMessageLike[]> = {};

      setPanelsConfig((config) =>
        config.map((panel, order) => {
          const id = generateThreadId(order);
          const initialMessages = buildSystemMessages(mergedPrompt);
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

      return chat;
    },
    [
      createNewChat,
      defaultProject,
      projects,
      runtimeControllers,
      setPanelsConfig,
      setPanelsState,
      setThreadMessages,
      setUIState,
      systemPrompt,
    ]
  );
}

const buildSystemMessages = (
  systemPrompt: string | null
): ThreadMessageLike[] => {
  if (!systemPrompt) return [];
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
};

const mergePrompts = (
  userPrompt: string | null,
  projectInstructions: string | null
): string | null => {
  return [userPrompt, projectInstructions].filter(Boolean).join("\n\n") || null;
};
