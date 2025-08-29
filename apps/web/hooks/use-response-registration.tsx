"use client";

import { GlobalComposerContext } from "@/components/providers/composer-provider";
import type { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useContext, useEffect } from "react";

export function useRuntimeRegistration(
  panelId: string,
  runtime: ReturnType<typeof useChatRuntime>
) {
  const ctx = useContext(GlobalComposerContext);

  useEffect(() => {
    if (!ctx || !runtime) return;
    ctx.register(panelId, runtime);
    return () => ctx.unregister(panelId);
  }, [ctx, panelId, runtime]);

  return null;
}
