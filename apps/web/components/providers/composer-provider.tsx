import type { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { createContext } from "react";

export const GlobalComposerContext = createContext<{
  prompt: string;
  setPrompt: (v: string) => void;
  register: (
    panelId: string,
    runtime: ReturnType<typeof useChatRuntime>
  ) => void;
  unregister: (panelId: string) => void;
  send: (text: string) => void;
} | null>(null);
