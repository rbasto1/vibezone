"use client";

import { AssistantHeader } from "@/components/assistant-ui/assistant-header";
import { GlobalComposer } from "@/components/assistant-ui/global-composer";
import { ResponsePanel } from "@/components/assistant-ui/response-panel";
import { ThreadWelcomeSuggestions } from "@/components/assistant-ui/thread-welcome-suggestions";
import { GlobalComposerContext } from "@/components/providers/composer-provider";
import { GlobalComposerProvider } from "@/components/providers/global-composer-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/components/ui/utils";
import { useCurrentChatSetter } from "@/hooks/use-chat";
import { usePanelsConfig, usePanelsStateValue } from "@/hooks/use-panels";
import { useUIState } from "@/hooks/use-ui-state";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import type { PanelConfig } from "@/store/panels";
import type { FC } from "react";
import { useContext, useMemo } from "react";
import { toast } from "sonner";
import { AppSidebarLoader } from "./app-sidebar-loader";
import { useSession } from "@/hooks/use-session";
import { useModelsValue } from "@/hooks/use-models";
import { AnonQuotaBanner } from "@/components/assistant-ui/anon-quota-banner";

export const Assistant: FC = () => {
  return (
    <GlobalComposerProvider>
      <AssistantContent />
    </GlobalComposerProvider>
  );
};

const AssistantContent: FC = () => {
  const [panelsConfig, setPanelsConfig] = usePanelsConfig();
  const panelsState = usePanelsStateValue();
  const [uiState, setUIState] = useUIState();
  const setCurrentChat = useCurrentChatSetter();
  const session = useSession();
  const { models } = useModelsValue();

  const ctx = useContext(GlobalComposerContext);
  if (!ctx) throw new Error("GlobalComposerContext is not available");

  const { prompt, setPrompt, send, getRuntimes } = ctx;

  const handleStopAll = () => {
    const failures: string[] = [];
    for (const runtime of getRuntimes().values()) {
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

  const handleSelectModelsGroup = (modelIds: string[]) => {
    // If anonymous, filter out premium/included models
    const allowedModelIds = session?.user
      ? modelIds
      : modelIds.filter((id) => {
          const m = models.find((mm) => mm.id === id);
          return m && !m.isPremium && !m.isIncluded;
        });

    if (!session?.user && allowedModelIds.length < modelIds.length) {
      toast.info("Sign in to use premium models");
    }
    if (allowedModelIds.length === 0) {
      toast.error("No available models for guests. Please sign in.");
      return;
    }

    setPanelsConfig(
      allowedModelIds.map((modelId, order): PanelConfig => {
        const provider = modelId.split(":")[0];
        if (!provider) throw new Error("Assert: this can't happen");
        return {
          id: generateThreadId(order),
          provider,
          model: modelId,
        };
      })
    );
    // Mark suggestions as used to hide them
    setUIState({ suggestionsUsed: true });
  };

  const panelCount = Math.min(Math.max(panelsConfig.length, 1), MAX_PANELS);
  const anyPanelRunning = useMemo(
    () => Object.values(panelsState).some((p) => p.running),
    [panelsState]
  );

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <AppSidebarLoader />
        <SidebarInset>
          <AssistantHeader panelCount={panelsConfig.length} />
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
              {/* Guest quota banner */}
              <AnonQuotaBanner />
              {/* Global suggestions under panels - only show if not used */}
              {!uiState.suggestionsUsed && (
                <ThreadWelcomeSuggestions onSelect={handleSelectModelsGroup} />
              )}

              {/* Global composer below panels */}
              <GlobalComposer
                value={prompt}
                onChange={setPrompt}
                onSubmit={() => {
                  send(prompt);
                  setCurrentChat((currentChat) =>
                    currentChat.firstUserMessage
                      ? currentChat
                      : {
                          ...currentChat,
                          firstUserMessage: prompt,
                        }
                  );
                }}
                onStopAll={anyPanelRunning ? handleStopAll : null}
              />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
