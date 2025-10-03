import { ThreadPrimitive, useThread } from "@assistant-ui/react";
import { motion } from "framer-motion";
import { type FC, type PropsWithChildren } from "react";

import { cn } from "@/components/ui/utils";
import { useMessageSaver } from "@/hooks/use-message-saver";
import { useSession } from "@/hooks/use-session";
import type { PanelConfig } from "@/store/panels";
import { AssistantMessage } from "./assistant-message";
import { ThreadError } from "./thread-error";
import { ThreadScrollToBottom } from "./thread-scroll-to-bottom";
import { ThreadWelcome } from "./thread-welcome";
import { UserMessage } from "./user-message";

interface ThreadProps extends PropsWithChildren {
  panel: PanelConfig;
  error: Error | undefined | null;
}

export const Thread: FC<ThreadProps> = ({ children, panel, error }) => {
  const thread = useThread();
  const isActive = thread.isRunning;
  const session = useSession();
  const autoScroll = session?.user?.preferenceAutoScroll ?? false;

  // Use the message saver hook to automatically save messages
  useMessageSaver(panel);

  return (
    <ThreadPrimitive.Root
      // aui-thread-root
      className={cn(
        "bg-background flex h-full flex-col",
        isActive && "matrix-streaming"
      )}
      style={{
        ["--thread-max-width" as string]: "48rem",
        ["--thread-padding-x" as string]: "1rem",
      }}
    >
      {/* aui-thread-viewport */}
      <ThreadPrimitive.Viewport
        className="relative flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll"
        autoScroll={autoScroll}
      >
        <ThreadPrimitive.If empty>
          <ThreadWelcome />
        </ThreadPrimitive.If>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />

        {/* Show error message if there's an error */}
        {error && <ThreadError error={error} />}

        <ThreadPrimitive.If empty={false}>
          {/* aui-thread-viewport-spacer */}
          <motion.div className="min-h-6 min-w-6 shrink-0" />
        </ThreadPrimitive.If>

        <ThreadScrollToBottom />
      </ThreadPrimitive.Viewport>
      {children}
    </ThreadPrimitive.Root>
  );
};
