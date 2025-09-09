"use client";

import { GlobalComposerContext } from "@/components/providers/composer-provider";
import type { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useContext, useEffect } from "react";

export function useRuntimeRegistration(
  panelId: string,
  runtime: ReturnType<typeof useChatRuntime>
) {
  const ctx = useContext(GlobalComposerContext);
  const register = ctx?.register;
  const unregister = ctx?.unregister;

  useEffect(() => {
    if (!register || !unregister) return;
    register(panelId, runtime);
    return () => unregister(panelId);
  }, [register, unregister, panelId, runtime]);

  return null;
}

export function useRuntimes() {
  const ctx = useContext(GlobalComposerContext);
  return ctx?.getRuntimes;
}
