"use client";

import type { ThreadMessageLike } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useAtomValue, useSetAtom } from "jotai";

import { useCurrentChatValue } from "@/hooks/use-chat";
import {
  usePanelsConfigSetter,
  usePanelsConfigValue,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useSaveLastModels } from "@/hooks/use-save-last-models";
import { useUIState, type PendingAddPanel } from "@/hooks/use-ui-state";
import {
  comparableMessagesEqual,
  toComparableMessages,
} from "@/lib/assistant-ui/message-compare";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId, getNextThreadOrderFromExisting } from "@/lib/id";
import { trpc } from "@/lib/trpc/client";
import { threadMessagesAtom } from "@/store/thread-messages";

interface FinalizeOptions {
  id: string;
  providerId: string;
  modelId: string;
  sourceThreadId?: string;
  sourceMessages?: ThreadMessageLike[];
}

interface UseAddAiOptions {
  onAddPanel?: () => void;
}

interface OpenSelectorOptions {
  showLimitToast?: boolean;
}

export const useAddAi = (options?: UseAddAiOptions) => {
  const { onAddPanel } = options ?? {};
  const t = useTranslations("AssistantHeader");
  const [{ addPanelPending }, setUIState] = useUIState();
  const panelsConfig = usePanelsConfigValue();
  const setPanelsConfig = usePanelsConfigSetter();
  const setPanelsState = usePanelsStateSetter();
  const saveLastModels = useSaveLastModels();
  const threadMessages = useAtomValue(threadMessagesAtom);
  const setThreadMessages = useSetAtom(threadMessagesAtom);
  const currentChatId = useCurrentChatValue()?.id ?? null;
  const { mutate: duplicateThread } = trpc.messages.duplicateThread.useMutation(
    {
      onError: (error) => {
        toast.error(`Could not save new thread: ${error.message}`);
      },
    }
  );

  const canAddMore = panelsConfig.length < MAX_PANELS;

  const cloneThreadMessages = useCallback((messages?: ThreadMessageLike[]) => {
    if (!messages?.length) return undefined;
    return messages.map((message) => ({ ...message }));
  }, []);

  const getPanelMessages = useCallback(
    (panelId: string): ThreadMessageLike[] => {
      const storedMessages = threadMessages[panelId];
      if (storedMessages?.length) {
        return storedMessages;
      }
      const panel = panelsConfig.find((item) => item.id === panelId);
      return panel?.initialMessages ?? [];
    },
    [panelsConfig, threadMessages]
  );

  const getSharedMessages = useCallback(() => {
    const [firstPanel, ...rest] = panelsConfig;
    if (!firstPanel || !rest.length) {
      return undefined;
    }
    const baseMessages = getPanelMessages(firstPanel.id);
    const comparableBase = toComparableMessages(baseMessages);
    const allMatch = rest.every((panel) => {
      const nextMessages = getPanelMessages(panel.id);
      const comparableNext = toComparableMessages(nextMessages);
      return comparableMessagesEqual(comparableBase, comparableNext);
    });
    return allMatch ? baseMessages : undefined;
  }, [getPanelMessages, panelsConfig]);

  const finalizeAddPanel = useCallback(
    ({
      id,
      providerId,
      modelId,
      sourceMessages,
      sourceThreadId,
    }: FinalizeOptions) => {
      const initialMessages = cloneThreadMessages(sourceMessages);
      const hasMessages = !!initialMessages?.some((m) => m.role === "user");

      setPanelsState((prev) => ({
        ...prev,
        [id]: {
          running: false,
          hasMessages,
        },
      }));

      setThreadMessages((prev) => ({
        ...prev,
        [id]: initialMessages ?? [],
      }));

      setPanelsConfig((prev) => {
        const newPanels = [
          ...prev,
          {
            id,
            provider: providerId,
            model: modelId,
            ...(initialMessages ? { initialMessages } : {}),
          },
        ];

        saveLastModels(newPanels);
        return newPanels;
      });

      onAddPanel?.();

      if (sourceThreadId && hasMessages && currentChatId) {
        duplicateThread({
          chatId: currentChatId,
          sourceThreadId,
          newThreadId: id,
          newModelId: modelId,
        });
      }

      setUIState((prev) => ({ ...prev, addPanelPending: null }));
    },
    [
      cloneThreadMessages,
      currentChatId,
      duplicateThread,
      onAddPanel,
      saveLastModels,
      setPanelsConfig,
      setPanelsState,
      setThreadMessages,
      setUIState,
    ]
  );

  const openAddAiSelector = useCallback(
    ({ showLimitToast }: OpenSelectorOptions = {}) => {
      if (!canAddMore) {
        if (showLimitToast) {
          toast.error(t("maxModelsTooltip", { max: MAX_PANELS }));
        }
        return;
      }

      setUIState((prev) => ({
        ...prev,
        modelPicker: { type: "add-panel" },
      }));
    },
    [canAddMore, setUIState, t]
  );

  const handleAddModelSelection = useCallback(
    (providerId: string, modelId: string) => {
      if (!canAddMore) return;

      const id = generateThreadId(getNextThreadOrderFromExisting(panelsConfig));
      const newPanel: PendingAddPanel = {
        id,
        providerId,
        modelId,
      };

      const closePicker = () =>
        setUIState((prev) => ({
          ...prev,
          modelPicker: null,
        }));

      if (!panelsConfig.length) {
        finalizeAddPanel(newPanel);
        closePicker();
        return;
      }

      const sharedMessages = getSharedMessages();
      const [sourcePanel, secondPanel] = panelsConfig;

      if (sharedMessages && sourcePanel) {
        finalizeAddPanel({
          ...newPanel,
          sourceMessages: sharedMessages,
          sourceThreadId: sourcePanel.id,
        });
        closePicker();
        return;
      }

      if (sourcePanel && !secondPanel) {
        const sourceMessages = getPanelMessages(sourcePanel.id);
        finalizeAddPanel({
          ...newPanel,
          sourceMessages,
          sourceThreadId: sourcePanel.id,
        });
        closePicker();
        return;
      }

      setUIState((prev) => ({
        ...prev,
        modelPicker: null,
        addPanelPending: newPanel,
      }));
    },
    [
      canAddMore,
      finalizeAddPanel,
      getPanelMessages,
      getSharedMessages,
      panelsConfig,
      setUIState,
    ]
  );

  const handleCopySelect = useCallback(
    (sourceId: string) => {
      if (!addPanelPending) return;
      const sourceMessages = getPanelMessages(sourceId);
      finalizeAddPanel({
        ...addPanelPending,
        sourceMessages,
        sourceThreadId: sourceId,
      });
    },
    [addPanelPending, finalizeAddPanel, getPanelMessages]
  );

  const handleCopyCancel = useCallback(() => {
    setUIState((prev) => ({ ...prev, addPanelPending: null }));
  }, [setUIState]);

  const copyOptions = useMemo(
    () => panelsConfig.map((panel) => ({ id: panel.id, modelId: panel.model })),
    [panelsConfig]
  );

  const addButtonTitle = canAddMore
    ? t("addAnotherTooltip")
    : t("maxModelsTooltip", { max: MAX_PANELS });
  const addButtonLabel = t("addAiButton");
  const addButtonAriaLabel = t("addAiAriaLabel");

  return {
    canAddMore,
    addButtonTitle,
    addButtonLabel,
    addButtonAriaLabel,
    openAddAiSelector,
    handleAddModelSelection,
    pendingPanel: addPanelPending,
    copyOptions,
    handleCopySelect,
    handleCopyCancel,
  };
};
