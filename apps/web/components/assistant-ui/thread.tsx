import { ThreadPrimitive, useThread } from "@assistant-ui/react";
import { motion } from "framer-motion";
import type { FC, PropsWithChildren } from "react";

import { AssistantMessage } from "./assistant-message";
import { EditComposer } from "./edit-composer";
import { ThreadWelcome } from "./thread-welcome";
import { UserMessage } from "./user-message";

export const Thread: FC<PropsWithChildren> = ({ children }) => {
  const thread = useThread();
  console.log(`thread.tsx: Panel thread:`, thread);

  return (
    <ThreadPrimitive.Root
      // aui-thread-root
      className="bg-background flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "48rem",
        ["--thread-padding-x" as string]: "1rem",
      }}
    >
      {/* aui-thread-viewport */}
      <ThreadPrimitive.Viewport className="relative flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll">
        <ThreadPrimitive.If empty>
          <ThreadWelcome />
        </ThreadPrimitive.If>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            EditComposer,
            AssistantMessage,
          }}
        />

        <ThreadPrimitive.If empty={false}>
          {/* aui-thread-viewport-spacer */}
          <motion.div className="min-h-6 min-w-6 shrink-0" />
        </ThreadPrimitive.If>
      </ThreadPrimitive.Viewport>

      {children}
    </ThreadPrimitive.Root>
  );
};
