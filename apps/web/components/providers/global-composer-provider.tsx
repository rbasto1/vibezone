"use client";

import { useAnonQuotaSetter, useAnonRemaining } from "@/hooks/use-anon-quota";
import {
  useClearAttachments,
  useCompleteAttachmentsValue,
} from "@/hooks/use-attachments";
import { usePanelStateSetter } from "@/hooks/use-panels";
import { useSession } from "@/hooks/use-session";
import { ANON_DAILY_LIMIT } from "@/store/anon-quota";
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
  const session = useSession();
  const attachments = useCompleteAttachmentsValue();
  const clearAttachments = useClearAttachments();

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

  const isLoggedIn = !!session?.user;
  const remaining = useAnonRemaining();
  const setAnonUsage = useAnonQuotaSetter();
  const send = useCallback(
    (text: string) => {
      const msg = text.trim();
      if (!msg || !attachments) return;

      if (!isLoggedIn) {
        // Anonymous quota enforcement
        const plannedPanels = registryRef.current.size;
        if (remaining < plannedPanels) {
          toast.error(
            `Guest limit reached (${ANON_DAILY_LIMIT}/day). Please sign in.`
          );
          return;
        }
      }

      const runningPanels: string[] = [];
      for (const [panelId, runtime] of registryRef.current.entries()) {
        try {
          runtime.thread.append({
            runConfig: { custom: { thisIscustom: true } },
            metadata: { custom: { thisIsMyMetadata: true } },
            role: "user",
            content: [{ type: "text", text: msg }],
            attachments,
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

      // After successfully enqueuing messages, consume credits for guests
      if (!isLoggedIn && runningPanels.length) {
        setAnonUsage((prev) => ({
          date: prev.date,
          count: prev.count + runningPanels.length,
        }));
      }

      // Clear the global prompt
      setGlobalPrompt("");
      clearAttachments();
    },
    [
      attachments,
      clearAttachments,
      isLoggedIn,
      remaining,
      setAnonUsage,
      setPanelState,
    ]
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
