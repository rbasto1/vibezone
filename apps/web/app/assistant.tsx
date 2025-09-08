"use client";

import type { useChatRuntime } from "@assistant-ui/react-ai-sdk";

import { AssistantHeader } from "@/components/assistant-ui/assistant-header";
import { GlobalComposer } from "@/components/assistant-ui/global-composer";
import { ResponsePanel } from "@/components/assistant-ui/response-panel";
import { ThreadWelcomeSuggestions } from "@/components/assistant-ui/thread-welcome-suggestions";
import { GlobalComposerContext } from "@/components/providers/composer-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/components/ui/utils";
import { useSession } from "@/hooks/use-session";
import { INITIAL_PANEL_COUNT, MAX_PANELS } from "@/lib/constants";
import { trpc } from "@/lib/trpc/client";
import type { FC } from "react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { AppSidebarLoader } from "./app-sidebar-loader";

export interface PanelConfig {
  id: string;
  provider: string;
  model: string;
}

// Global composer context to broadcast a prompt to all panels
type RuntimeRegistry = Map<string, ReturnType<typeof useChatRuntime>>; // panelId -> runtime

interface AssistantProps {
  initialPanels: PanelConfig[];
}

export const Assistant: FC<AssistantProps> = ({ initialPanels }) => {
  const [panels, setPanels] = useState(
    initialPanels.slice(0, INITIAL_PANEL_COUNT)
  );

  const authData = useSession();
  const setLastModels = trpc.users.setLastModels.useMutation();

  const removePanel = (id: string) => {
    setPanels((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
  };

  const saveLastModels = (newPanels: PanelConfig[]) => {
    if (!authData?.user) return;
    const modelIds = newPanels.map((p) => p.model).slice(0, MAX_PANELS);
    setLastModels.mutate({ modelIds });
  };

  const changePanelModel = (
    panelId: string,
    providerId: string,
    modelId: string
  ) => {
    const newPanels = panels.map((p) =>
      p.id === panelId ? { ...p, provider: providerId, model: modelId } : p
    );
    setPanels(newPanels);
    saveLastModels(newPanels);
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
    for (const runtime of registryRef.current.values()) {
      try {
        runtime.thread.append({
          runConfig: { custom: { thisIscustom: true } },
          metadata: { custom: { thisIsMyMetadata: true } },
          sourceId: "this is the source",
          role: "user",
          content: [{ type: "text", text: msg }],
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        toast.error(`Send failed for a panel: ${message}`);
      }
    }

    // Clear the global prompt
    setGlobalPrompt("");
  }, []);

  const handleAddPanel = () => {
    const next = initialPanels.find(
      (p) => !panels.some((pp) => pp.id === p.id)
    );
    const newPanels = next ? [...panels, next] : panels;
    setPanels(newPanels);
    saveLastModels(newPanels);
  };

  const panelCount = Math.min(Math.max(panels.length, 1), MAX_PANELS);

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <AppSidebarLoader />
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
                  panelCount === 1 && "grid-cols-1",
                  panelCount === 2 && "md:grid-cols-2",
                  panelCount === 3 && "md:grid-cols-3"
                )}
              >
                {panels.map((panel) => (
                  <ResponsePanel
                    key={panel.id}
                    panel={panel}
                    onClose={
                      panels.length > 1
                        ? () => removePanel(panel.id)
                        : undefined
                    }
                    onChangeModel={(providerId, modelId) =>
                      changePanelModel(panel.id, providerId, modelId)
                    }
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
                  onStopAll={() => {
                    const failures: string[] = [];
                    for (const runtime of registryRef.current.values()) {
                      try {
                        runtime.thread.cancelRun();
                      } catch (e) {
                        const message =
                          e instanceof Error ? e.message : String(e);
                        failures.push(message);
                      }
                    }
                    if (failures.length) {
                      toast.error(
                        `Some panels failed to stop: ${failures.join("; ")}`
                      );
                    }
                  }}
                />
              </div>
            </div>
          </GlobalComposerContext.Provider>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
