"use client";

import type {
  ExportedMessageRepository,
  ThreadMessageLike,
} from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import { useThreadRuntimeControllersValue } from "./use-thread-controllers";
import { useThreadMessages } from "./use-thread-messages";

interface UseDeleteMessagesAfterParams {
  threadId: string;
  chatId: string | null;
  projectId: string | null;
}

interface PendingDeletion {
  toastId: string | number;
  previousMessages: ReturnType<typeof useThreadMessages>[0];
  previousRepository: ExportedMessageRepository | null;
  messageId: string;
  chatId: string;
  projectId: string;
}

const sliceRepositoryUntil = (
  repository: ExportedMessageRepository,
  messageId: string
): ExportedMessageRepository => {
  const trimmed: ExportedMessageRepository["messages"] = [];
  let found = false;
  for (const entry of repository.messages) {
    trimmed.push(entry);
    if (entry.message.id === messageId) {
      found = true;
      break;
    }
  }
  if (!found) {
    return repository;
  }
  return {
    headId: trimmed.at(-1)?.message.id ?? null,
    messages: trimmed,
  };
};

export const useDeleteMessagesAfter = ({
  threadId,
  chatId,
  projectId,
}: UseDeleteMessagesAfterParams) => {
  const [threadMessages, setThreadMessages] = useThreadMessages(threadId);
  const deleteMessagesMutation =
    trpc.messages.deleteMessagesAfter.useMutation();
  const pendingDeletionRef = useRef<PendingDeletion | null>(null);
  const t = useTranslations("Message");
  const runtimeControllers = useThreadRuntimeControllersValue();
  const runtimeController = runtimeControllers[threadId];

  const syncRuntimeWithMessages = useCallback(
    (
      messages: ThreadMessageLike[],
      repository?: ExportedMessageRepository | null
    ) => {
      setThreadMessages(messages);
      runtimeController?.syncMessages?.(messages);
      if (!runtimeController) return;
      if (repository) {
        runtimeController.runtime.thread.import(repository);
        return;
      }
      runtimeController.runtime.thread.reset(messages);
    },
    [runtimeController, setThreadMessages]
  );

  const finalizeDeletion = useCallback(() => {
    const pending = pendingDeletionRef.current;
    if (!pending) return;

    pendingDeletionRef.current = null;
    void deleteMessagesMutation
      .mutateAsync({
        chatId: pending.chatId,
        projectId: pending.projectId,
        threadId,
        messageId: pending.messageId,
      })
      .catch((error) => {
        console.error("Failed to delete succeeding messages:", error);
        syncRuntimeWithMessages(
          pending.previousMessages,
          pending.previousRepository
        );
        toast.error(t("trim.errors.failed"));
      });
  }, [deleteMessagesMutation, syncRuntimeWithMessages, t, threadId]);

  const handleUndo = useCallback(() => {
    const pending = pendingDeletionRef.current;
    if (!pending) return;

    pendingDeletionRef.current = null;
    syncRuntimeWithMessages(
      pending.previousMessages,
      pending.previousRepository
    );
    toast.dismiss(pending.toastId);
  }, [syncRuntimeWithMessages]);

  const deleteMessagesAfter = useCallback(
    (messageId: string | null | undefined) => {
      if (!chatId || !projectId) {
        toast.error(t("trim.errors.unavailable"));
        return;
      }

      if (!messageId) {
        toast.error(t("trim.errors.notFound"));
        return;
      }

      if (pendingDeletionRef.current) {
        toast.info(t("trim.errors.pending"));
        return;
      }

      const targetIndex = threadMessages.findIndex(
        (message) => message.id === messageId
      );

      if (targetIndex === -1) {
        toast.error(t("trim.errors.notFound"));
        return;
      }

      if (targetIndex === threadMessages.length - 1) {
        toast.info(t("trim.errors.noChanges"));
        return;
      }

      const nextMessages = threadMessages.slice(0, targetIndex + 1);
      const toastDuration = 5000;
      const handleToastEvent = (toastInfo: { id: string | number }) => {
        if (pendingDeletionRef.current?.toastId === toastInfo.id) {
          finalizeDeletion();
        }
      };
      const toastId = toast(t("trim.toast"), {
        duration: toastDuration,
        action: {
          label: t("trim.undo"),
          onClick: handleUndo,
        },
        onDismiss: handleToastEvent,
        onAutoClose: handleToastEvent,
      });

      const previousRepository = runtimeController
        ? runtimeController.runtime.thread.export()
        : null;
      const trimmedRepository =
        previousRepository && runtimeController
          ? sliceRepositoryUntil(previousRepository, messageId)
          : null;

      pendingDeletionRef.current = {
        toastId,
        previousMessages: threadMessages,
        previousRepository,
        messageId,
        chatId,
        projectId,
      };
      syncRuntimeWithMessages(nextMessages, trimmedRepository);
    },
    [
      chatId,
      projectId,
      threadMessages,
      t,
      handleUndo,
      syncRuntimeWithMessages,
      finalizeDeletion,
      runtimeController,
    ]
  );

  return { deleteMessagesAfter };
};
