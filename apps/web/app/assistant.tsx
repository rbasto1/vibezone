"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";

import { AppSidebar } from "@/components/app-sidebar";
import { AssistantHeader } from "@/components/assistant-ui/assistant-header";
import { GlobalComposer } from "@/components/assistant-ui/global-composer";
import { ResponsePanel } from "@/components/assistant-ui/response-panel";
import { ThreadWelcomeSuggestions } from "@/components/assistant-ui/thread-welcome-suggestions";
import { GlobalComposerContext } from "@/components/providers/composer-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/components/ui/utils";
import { useCallback, useMemo, useRef, useState } from "react";

export type Provider = "openai" | "anthropic" | "gemini";

export interface PanelConfig {
  id: string;
  provider: Provider;
  model: string;
  temperature?: number;
}

export const MAX_PANELS = 3;

// Global composer context to broadcast a prompt to all panels
type RuntimeRegistry = Map<string, ReturnType<typeof useChatRuntime>>; // panelId -> runtime

interface AssistantProps {
  initialPanels: PanelConfig[];
}

export const Assistant = ({ initialPanels }: AssistantProps) => {
  // Panels are now passed from a Server Component to avoid SSR/client mismatches.
  const [panels, setPanels] = useState<PanelConfig[]>(initialPanels);

  const removePanel = (id: string) => {
    setPanels((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
  };

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
  const send = useCallback((text: string) => {
    const msg = text.trim();
    if (!msg) return;

    // Send directly to each runtime
    for (const [panelId, runtime] of registryRef.current.entries()) {
      try {
        runtime.thread.append({
          role: "user",
          content: [{ type: "text", text: msg }],
        });
      } catch (e) {
        console.error("Send failed for panel", panelId, e);
      }
    }

    // Clear the global prompt
    setGlobalPrompt("");
  }, []);

  const handleAddPanel = () => {
    setPanels((prev) => {
      if (prev.length >= MAX_PANELS) return prev;
      // Default new panel to OpenAI gpt-4o-mini
      const next: PanelConfig = {
        id: crypto.randomUUID(),
        provider: "openai",
        model: "gpt-4o-mini",
        temperature: 0.1,
      };
      return [...prev, next];
    });
  };

  const gridColsClass = useMemo(() => {
    const count = Math.min(Math.max(panels.length, 1), MAX_PANELS);
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "md:grid-cols-2";
    return "md:grid-cols-3";
  }, [panels.length]);

  // Runtime for the sidebar components (e.g., ThreadList) that require context
  // TODO: refactor this, we have to list threads from a global list
  const sidebarRuntime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/stream/openai`,
      body: {
        config: {
          model: "gpt-4o-mini",
          temperature: 0.1,
        },
      },
    }),
  });

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <AssistantRuntimeProvider runtime={sidebarRuntime}>
          <AppSidebar />
        </AssistantRuntimeProvider>
        <SidebarInset>
          <AssistantHeader
            onAddPanel={handleAddPanel}
            panelCount={panels.length}
          />
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
                  gridColsClass
                )}
              >
                {panels.map((panel) => (
                  <ResponsePanel
                    key={panel.id}
                    panel={panel}
                    canClose={panels.length > 1}
                    onClose={() => removePanel(panel.id)}
                  />
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
                />
              </div>
            </div>
          </GlobalComposerContext.Provider>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
