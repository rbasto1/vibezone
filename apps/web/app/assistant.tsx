"use client";

import type { useChatRuntime } from "@assistant-ui/react-ai-sdk";

import { AssistantHeader } from "@/components/assistant-ui/assistant-header";
import { GlobalComposer } from "@/components/assistant-ui/global-composer";
import { ResponsePanel } from "@/components/assistant-ui/response-panel";
import { ThreadWelcomeSuggestions } from "@/components/assistant-ui/thread-welcome-suggestions";
import { GlobalComposerContext } from "@/components/providers/composer-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/components/ui/utils";
import {
  usePanelsConfigValue,
  usePanelsStateValue,
  usePanelStateSetter,
} from "@/hooks/use-panels";
import { MAX_PANELS } from "@/lib/constants";
import type { FC } from "react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { AppSidebarLoader } from "./app-sidebar-loader";

// Global composer context to broadcast a prompt to all panels
type RuntimeRegistry = Map<string, ReturnType<typeof useChatRuntime>>; // panelId -> runtime

export const Assistant: FC = () => {
  const panelsConfig = usePanelsConfigValue();
  const panelsState = usePanelsStateValue();
  const setPanelState = usePanelStateSetter();

  // Global composer state and registry
  const [globalPrompt, setGlobalPrompt] = useState("");
  const registryRef = useRef<RuntimeRegistry>(new Map());
  const register = useCallback(
    (panelId: string, runtime: ReturnType<typeof useChatRuntime>) =>
      registryRef.current.set(panelId, runtime),
    []
  );
  const unregister = useCallback(
    (panelId: string) => registryRef.current.delete(panelId),
    []
  );
  const send = useCallback(
    (text: string) => {
      const msg = text.trim();
      if (!msg) return;

      // Send directly to each runtime
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

  const handleStopAll = () => {
    const failures: string[] = [];
    for (const runtime of registryRef.current.values()) {
      try {
        runtime.thread.cancelRun();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        failures.push(message);
      }
    }
    if (failures.length) {
      toast.error(`Some panels failed to stop: ${failures.join("; ")}`);
    }
  };

  const panelCount = Math.min(Math.max(panelsConfig.length, 1), MAX_PANELS);
  const anyPanelRunning = Object.values(panelsState).some((p) => p.running);

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <AppSidebarLoader />
        <SidebarInset>
          <AssistantHeader panelCount={panelsConfig.length} />
          <GlobalComposerContext.Provider
            value={{
              prompt: globalPrompt,
              setPrompt: setGlobalPrompt,
              register,
              unregister,
              send,
            }}
          >
            <div className="flex-1 overflow-hidden p-3 flex flex-col gap-3">
              <div
                className={cn(
                  "grid gap-3 flex-1 min-h-0 auto-rows-fr w-full",
                  panelCount === 1 && "grid-cols-1",
                  panelCount === 2 && "md:grid-cols-2",
                  panelCount === 3 && "md:grid-cols-3"
                )}
              >
                {panelsConfig.map((panel) => (
                  <ResponsePanel key={panel.id} panel={panel} />
                ))}
              </div>

              {/* Centered container for suggestions and composer */}
              <div className="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl flex flex-col gap-3 px-2 sm:px-3">
                {/* Global suggestions under panels */}
                <ThreadWelcomeSuggestions
                  onSelect={(text) => setGlobalPrompt(text)}
                />

                {/* Global composer below panels */}
                <GlobalComposer
                  value={globalPrompt}
                  onChange={setGlobalPrompt}
                  onSubmit={() => send(globalPrompt)}
                  onStopAll={anyPanelRunning ? handleStopAll : null}
                />
              </div>
            </div>
          </GlobalComposerContext.Provider>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
