import { MessagePrimitive } from "@assistant-ui/react";
import { motion } from "framer-motion";
import { StarIcon } from "lucide-react";
import type { FC } from "react";

import { AssistantActionBar } from "./assistant-action-bar";
import { Audio } from "./assistant-message-part-audio";
import { File } from "./assistant-message-part-file";
import { Image } from "./assistant-message-part-image";
import { Reasoning } from "./assistant-message-part-reasoning";
import { Source } from "./assistant-message-part-source";
import { BranchPicker } from "./branch-picker";
import { MarkdownText } from "./markdown-text";
import { MessageError } from "./message-error";
import { ToolFallback } from "./tool-fallback";

export const AssistantMessage: FC = () => {
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
