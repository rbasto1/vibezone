"use client";

import type { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import React, { useCallback, useRef } from "react";
import {
  GlobalComposerContext,
  type RuntimeRegistry,
} from "./composer-provider";

type Props = React.PropsWithChildren;

export function GlobalComposerProvider({ children }: Props) {
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

  return (
    <GlobalComposerContext.Provider
      value={{
        register,
        unregister,
        getRuntimes,
      }}
    >
      {children}
    </GlobalComposerContext.Provider>
  );
}
