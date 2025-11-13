import { generateId } from "ai";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { useSidebar } from "@/components/ui/sidebar/sidebar-context";
import { useInstructionsValue } from "@/hooks/use-instructions";
import { useMemoriesValue } from "@/hooks/use-memories";
import {
  usePanelsConfigSetter,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useProjectsValue } from "@/hooks/use-projects";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { generateThreadId } from "@/lib/id";
import {
  composeInstructionPrompt,
  type InstructionPromptResult,
} from "@/lib/instructions";
import type { PanelConfig } from "@/store/panels";
import { usePendingUserMessagesClear } from "@/store/pending-user-messages";
import { threadMessagesAtom } from "@/store/thread-messages";
import type { ThreadMessageLike } from "@assistant-ui/react";
import type {
  SystemMessageInstruction,
  SystemMessageMemory,
} from "@vibezone/database";
import { useNewChat } from "./use-chat";
import { useStableValue } from "./use-stable-value";
import { useThreadRuntimeControllersValue } from "./use-thread-controllers";

interface NewChatOptions {
  projectId?: string | null;
}

export function useNewChatHandler() {
  const t = useTranslations();
  const createNewChat = useNewChat();
  const setPanelsState = usePanelsStateSetter();
  const setPanelsConfig = usePanelsConfigSetter();
  const setUIState = useUIStateSetter();
  const { isMobile, setOpenMobile } = useSidebar();
  const projects = useProjectsValue();
  const instructions = useInstructionsValue();
  const memories = useMemoriesValue();
  const runtimeControllers = useThreadRuntimeControllersValue();
  const setThreadMessages = useSetAtom(threadMessagesAtom);
  const clearPendingUserMessages = usePendingUserMessagesClear();

  const baseSystemPrompt = t("Prompts.system");

  const defaultProject = useMemo(
    () => projects.find((project) => project.isDefault) ?? projects[0] ?? null,
    [projects]
  );

  const state = useStableValue({
    defaultProject,
    instructions,
    projects,
    runtimeControllers,
    baseSystemPrompt,
    memories,
  });

  return useCallback(
    (options?: NewChatOptions) => {
      const {
        defaultProject,
        instructions,
        projects,
        runtimeControllers,
        memories,
        baseSystemPrompt,
      } = state.current;

      const targetProject = options?.projectId
        ? (projects.find((project) => project.id === options.projectId) ?? null)
        : defaultProject;

      const targetProjectId = targetProject?.id ?? options?.projectId ?? null;

      const promptResult = composeInstructionPrompt(
        baseSystemPrompt,
        instructions,
        memories,
        targetProjectId,
        projects
      );

      const chat = createNewChat(targetProjectId);

      for (const controller of Object.values(runtimeControllers)) {
        controller.runtime.thread.reset();
      }

      clearPendingUserMessages();
      setPanelsState({});
      const nextThreadMessages: Record<string, ThreadMessageLike[]> = {};

      setPanelsConfig((config) =>
        config.map((panel, order) => {
          const id = generateThreadId(order);
          const initialMessages = buildSystemMessages(
            promptResult.prompt,
            promptResult.instructions,
            promptResult.memories
          );
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

      setUIState({
        panelOpen: null,
        suggestionsUsed: false,
        modelPicker: null,
      });
      if (isMobile) {
        setOpenMobile(false);
      }

      return chat;
    },
    [
      state,
      createNewChat,
      clearPendingUserMessages,
      setPanelsConfig,
      setPanelsState,
      setThreadMessages,
      setUIState,
      isMobile,
      setOpenMobile,
    ]
  );
}

const buildSystemMessages = (
  systemPrompt: InstructionPromptResult["prompt"],
  instructions?: SystemMessageInstruction[],
  memories?: SystemMessageMemory[]
): ThreadMessageLike[] => {
  if (!systemPrompt) return [];
  const customMetadata = {
    ...(instructions?.length ? { instructions } : {}),
    ...(memories?.length ? { memories } : {}),
  };
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
      metadata: {
        custom: Object.keys(customMetadata).length ? customMetadata : {},
      },
    } satisfies ThreadMessageLike,
  ];
};
