import { ThreadPrimitive } from "@assistant-ui/react";
import { motion } from "framer-motion";
import type { FC } from "react";

export const ThreadWelcome: FC = () => {
  return (
    <ThreadPrimitive.Empty>
      {/* aui-thread-welcome-root */}
      <div className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col px-[var(--thread-padding-x)]">
        {/* aui-thread-welcome-center */}
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          {/* aui-thread-welcome-message */}
          <div className="flex size-full flex-col justify-center px-8 md:mt-20">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.5 }}
              // aui-thread-welcome-message-motion-1
              className="text-2xl font-semibold"
            >
              Hello there!
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.6 }}
              // aui-thread-welcome-message-motion-2
              className="text-muted-foreground/65 text-2xl"
            >
              How can I help you today?
            </motion.div>
          </div>
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
};
