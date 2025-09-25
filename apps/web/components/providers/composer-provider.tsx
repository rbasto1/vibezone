import type { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { createContext } from "react";

// Global composer context to broadcast a prompt to all panels
export type RuntimeRegistry = Map<string, ReturnType<typeof useChatRuntime>>; // panelId -> runtime

export const GlobalComposerContext = createContext<{
  register: (
    panelId: string,
    runtime: ReturnType<typeof useChatRuntime>
  ) => void;
  unregister: (panelId: string) => void;
  getRuntimes: () => RuntimeRegistry;
} | null>(null);
