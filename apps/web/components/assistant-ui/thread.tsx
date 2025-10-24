import { ThreadPrimitive, useThread } from "@assistant-ui/react";
import { motion } from "framer-motion";
import { type FC, type PropsWithChildren, useMemo } from "react";

import { cn } from "@/components/ui/utils";
import { useMessageSaver } from "@/hooks/use-message-saver";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import type { PanelConfig } from "@/store/panels";
import { AssistantMessage } from "./messages/assistant-message";
import { UserMessage } from "./messages/user-message";
import { ThreadError } from "./thread-error";
import { ThreadIfEmpty } from "./thread-if-empty";
import { ThreadScrollToBottom } from "./thread-scroll-to-bottom";
import { ThreadWelcome } from "./thread-welcome";

interface ThreadProps extends PropsWithChildren {
  panel: PanelConfig;
  error: Error | undefined | null;
}

export const Thread: FC<ThreadProps> = ({ children, panel, error }) => {
  const thread = useThread();
  const isActive = thread.isRunning;
  const preferences = useUserPreferencesValue();
  const autoScroll = preferences.autoScroll;

  // Use the message saver hook to automatically save messages
  useMessageSaver(panel);

  const threadMessageComponents = useMemo(
    () => ({
      UserMessage: () => (
        <UserMessage threadId={panel.id} modelId={panel.model} />
      ),
      AssistantMessage: () => (
        <AssistantMessage threadId={panel.id} modelId={panel.model} />
      ),
    }),
    [panel.id, panel.model]
  );

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
        <ThreadIfEmpty empty>
          <ThreadWelcome />
        </ThreadIfEmpty>

        <ThreadPrimitive.Messages components={threadMessageComponents} />

        {/* Show error message if there's an error */}
        {error && <ThreadError error={error} />}

        <ThreadIfEmpty empty={false}>
          {/* aui-thread-viewport-spacer */}
          <motion.div className="min-h-6 min-w-6 shrink-0" />
        </ThreadIfEmpty>

        <ThreadScrollToBottom />
      </ThreadPrimitive.Viewport>
      {children}
    </ThreadPrimitive.Root>
  );
};
