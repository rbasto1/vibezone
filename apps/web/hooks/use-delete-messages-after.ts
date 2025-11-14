"use client";

import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import { useThreadMessages } from "./use-thread-messages";

interface UseDeleteMessagesAfterParams {
  threadId: string;
  chatId: string | null;
  projectId: string | null;
}

interface PendingDeletion {
  toastId: string | number;
  previousMessages: ReturnType<typeof useThreadMessages>[0];
  messageId: string;
  chatId: string;
  projectId: string;
}

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
        setThreadMessages(pending.previousMessages);
        toast.error(t("trim.errors.failed"));
      });
  }, [deleteMessagesMutation, setThreadMessages, t, threadId]);

  const handleUndo = useCallback(() => {
    const pending = pendingDeletionRef.current;
    if (!pending) return;

    pendingDeletionRef.current = null;
    setThreadMessages(pending.previousMessages);
    toast.dismiss(pending.toastId);
  }, [setThreadMessages]);

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
        if (process.env.NODE_ENV !== "production") {
          console.debug("[useDeleteMessagesAfter] not-found", {
            messageId,
            threadId,
          });
        }
        toast.error(t("trim.errors.notFound"));
        return;
      }

      if (targetIndex === threadMessages.length - 1) {
        toast.info(t("trim.errors.noChanges"));
        return;
      }

      const nextMessages = threadMessages.slice(0, targetIndex + 1);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[useDeleteMessagesAfter] trimming", {
          keep: nextMessages.map((message) => message.id),
          remove: threadMessages
            .slice(targetIndex + 1)
            .map((message) => message.id),
        });
      }
      const toastId = toast(t("trim.toast"), {
        action: {
          label: t("trim.undo"),
          onClick: handleUndo,
        },
        onDismiss: (toastInfo) => {
          if (pendingDeletionRef.current?.toastId === toastInfo.id) {
            finalizeDeletion();
          }
        },
      });

      pendingDeletionRef.current = {
        toastId,
        previousMessages: threadMessages,
        messageId,
        chatId,
        projectId,
      };
      setThreadMessages(nextMessages);
    },
    [
      chatId,
      projectId,
      threadMessages,
      t,
      handleUndo,
      setThreadMessages,
      threadId,
      finalizeDeletion,
    ]
  );

  return { deleteMessagesAfter };
};
