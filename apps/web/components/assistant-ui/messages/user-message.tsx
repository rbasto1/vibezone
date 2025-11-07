import { MessagePrimitive, useAssistantState } from "@assistant-ui/react";
import { motion } from "framer-motion";
import { useEffect, useMemo, type FC } from "react";

import { usePendingUserMessagesAppender } from "@/store/pending-user-messages";
import { BranchPicker } from "./branch-picker";
import { UserMessageAttachments } from "./message-attachments";
import { TextWithAttachments } from "./text-with-attachments";
import { UserActionBar } from "./user-action-bar";

interface UserMessageProps {
  threadId: string;
  modelId: string;
}

export const UserMessage: FC<UserMessageProps> = ({ threadId, modelId }) => {
  const branchingEnabled = false;

  const message = useAssistantState(({ message }) => message);
  const appendPendingUserMessage = usePendingUserMessagesAppender();

  useEffect(() => {
    if (message.metadata.custom?.saved) return; // loaded from the db
    appendPendingUserMessage(message, threadId, modelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  const components = useMemo(
    () => ({
      Text: TextWithAttachments,
      Image: EmptyPart,
      File: EmptyPart,
    }),
    []
  );

  return (
    <MessagePrimitive.Root asChild>
      <motion.div
        // aui-user-message-root
        className="mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-1 px-[var(--thread-padding-x)] py-4 [&:where(>*)]:col-start-2"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role="user"
      >
        {branchingEnabled && <UserActionBar />}

        <UserMessageAttachments />

        {/* aui-user-message-content */}
        <div className="bg-muted text-foreground col-start-2 rounded-3xl px-5 py-2.5 break-words">
          <MessagePrimitive.Content components={components} />
        </div>

        {/* aui-user-branch-picker */}
        <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
      </motion.div>
    </MessagePrimitive.Root>
  );
};

const EmptyPart: FC = () => null;
