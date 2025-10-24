import { MessagePrimitive, useMessage } from "@assistant-ui/react";
import { motion } from "framer-motion";
import { StarIcon } from "lucide-react";
import { useEffect, type FC } from "react";

import { AssistantActionBar } from "./assistant-action-bar";
import { BranchPicker } from "./branch-picker";
import { MarkdownText } from "./markdown-text";
import { MessageError } from "./message-error";
import { Audio } from "./parts/assistant-message-part-audio";
import { File } from "./parts/assistant-message-part-file";
import { Image } from "./parts/assistant-message-part-image";
import { Reasoning } from "./parts/assistant-message-part-reasoning";
import { Source } from "./parts/assistant-message-part-source";
import { ToolFallback } from "./tool-fallback";

interface AssistantMessageProps {
  threadId: string;
  modelId: string;
}

export const AssistantMessage: FC<AssistantMessageProps> = ({
  threadId,
  modelId,
}) => {
  const message = useMessage();

  useEffect(() => {
    if (message.metadata.custom?.saved) return; // loaded from the db
    console.log("AssistantMessage id changed", message.id);
  }, [message.id]);

  useEffect(() => {
    if (
      message.metadata.custom?.saved ||
      message.id.startsWith("__optimistic__") ||
      message.status?.type === "running"
    ) {
      return;
    }
    console.log(
      "AssistantMessage message mutated",
      message.id,
      message.status?.type
    );
  }, [message]);

  return (
    <MessagePrimitive.Root asChild>
      <motion.div
        // aui-assistant-message-root
        className="relative mx-auto grid w-full max-w-[var(--thread-max-width)] grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] px-[var(--thread-padding-x)] py-4"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role="assistant"
      >
        {/* aui-assistant-message-avatar */}
        <div className="ring-border bg-background col-start-1 row-start-1 flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
          <StarIcon size={14} />
        </div>

        {/* aui-assistant-message-content */}
        <div className="text-foreground col-span-2 col-start-2 row-start-1 ml-4 leading-7 break-words">
          <MessagePrimitive.Content
            components={{
              Text: MarkdownText,
              Reasoning,
              Image,
              File,
              Source,
              Unstable_Audio: Audio,
              tools: { Fallback: ToolFallback },
            }}
          />
          <MessageError />
        </div>

        <AssistantActionBar />

        {/* aui-assistant-branch-picker */}
        <BranchPicker className="col-start-2 row-start-2 mr-2 -ml-2" />
      </motion.div>
    </MessagePrimitive.Root>
  );
};
