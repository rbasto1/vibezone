"use client";

import { usePanelStateSetter } from "@/hooks/use-panels";
import type { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import React, { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  GlobalComposerContext,
  type RuntimeRegistry,
} from "./composer-provider";

type Props = React.PropsWithChildren;

export function GlobalComposerProvider({ children }: Props) {
  const [globalPrompt, setGlobalPrompt] = useState("");
  const setPanelState = usePanelStateSetter();

  // Registry of runtimes by panelId
  const registryRef = useRef<RuntimeRegistry>(new Map());

  const register = useCallback(
    (panelId: string, runtime: ReturnType<typeof useChatRuntime>) => {
      registryRef.current.set(panelId, runtime);
    },
    []
  );

  const unregister = useCallback((panelId: string) => {
    registryRef.current.delete(panelId);
  }, []);

  const getRuntimes = useCallback(() => registryRef.current, []);

  const send = useCallback(
    (text: string) => {
      const msg = text.trim();
      if (!msg) return;

      const runningPanels: string[] = [];
      for (const [panelId, runtime] of registryRef.current.entries()) {
        try {
          runtime.thread.append({
            runConfig: { custom: { thisIscustom: true } },
            metadata: { custom: { thisIsMyMetadata: true } },
            sourceId: "this is the source",
            role: "user",
            content: [{ type: "text", text: msg }],
          });
          runningPanels.push(panelId);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          toast.error(`Send failed for a panel: ${message}`);
        }
      }

      // Update panel states to running
      runningPanels.forEach((panelId) => {
        setPanelState(panelId, (currentState) => ({
          ...currentState,
          running: true,
          error: undefined,
        }));
      });

      // Clear the global prompt
      setGlobalPrompt("");
    },
    [setPanelState]
  );

  return (
    <GlobalComposerContext.Provider
      value={{
        prompt: globalPrompt,
        setPrompt: setGlobalPrompt,
        register,
        unregister,
        send,
        getRuntimes,
      }}
    >
      {children}
    </GlobalComposerContext.Provider>
  );
}
