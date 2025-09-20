"use client";

import { AnonQuotaBanner } from "@/components/assistant-ui/anon-quota-banner";
import { AssistantHeader } from "@/components/assistant-ui/assistant-header";
import { GlobalComposer } from "@/components/assistant-ui/global-composer";
import { ResponsePanel } from "@/components/assistant-ui/response-panel";
import { ThreadWelcomeSuggestions } from "@/components/assistant-ui/thread-welcome-suggestions";
import { GlobalComposerContext } from "@/components/providers/composer-provider";
import { GlobalComposerProvider } from "@/components/providers/global-composer-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/components/ui/utils";
import { useCurrentChatSetter } from "@/hooks/use-chat";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModelsValue } from "@/hooks/use-models";
import { usePanelsConfig, usePanelsStateValue } from "@/hooks/use-panels";
import { useSession } from "@/hooks/use-session";
import { useUIState } from "@/hooks/use-ui-state";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import type { PanelConfig } from "@/store/panels";
import type { FC } from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSidebarLoader } from "./app-sidebar-loader";

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
  const isMobile = useIsMobile();
  const [mobileActivePanelId, setMobileActivePanelId] = useState<string>();

  const ctx = useContext(GlobalComposerContext);
  if (!ctx) throw new Error("GlobalComposerContext is not available");

  const { prompt, setPrompt, send, getRuntimes } = ctx;

  useEffect(() => {
    if (!panelsConfig.length) {
      setMobileActivePanelId(undefined);
      return;
    }

    setMobileActivePanelId((current) => {
      if (current && panelsConfig.some((panel) => panel.id === current)) {
        return current;
      }

      return panelsConfig[0]?.id;
    });
  }, [panelsConfig]);

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
  const modelNamesById = useMemo(() => {
    const entries = new Map<string, string>();
    for (const model of models) {
      entries.set(model.id, model.name);
    }
    return entries;
  }, [models]);
  const activePanelId = mobileActivePanelId ?? panelsConfig[0]?.id;
  const showTabs = isMobile && panelsConfig.length > 1;
  const hasPanels = panelsConfig.length > 0;
  const activePanel = hasPanels
    ? (panelsConfig.find((panel) => panel.id === activePanelId) ??
      panelsConfig[0])
    : undefined;
  const hideAnonBanner = isMobile && uiState.suggestionsUsed;

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <AppSidebarLoader />
        <SidebarInset>
          <AssistantHeader
            panelCount={panelsConfig.length}
            suggestionsUsed={uiState.suggestionsUsed}
          />
          <div className="flex-1 overflow-hidden p-3 flex flex-col gap-3">
            {isMobile ? (
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                {showTabs && (
                  <div className="-mx-1 px-1">
                    <div
                      className="flex items-center border-b border-border rounded-t-md overflow-hidden"
                      role="tablist"
                    >
                      {panelsConfig.map((panel, index) => {
                        const modelLabel =
                          modelNamesById.get(panel.model) ?? panel.model;
                        const label = `${index + 1}: ${modelLabel}`;
                        const isActive = activePanelId === panel.id;
                        return (
                          <button
                            key={panel.id}
                            type="button"
                            onClick={() => setMobileActivePanelId(panel.id)}
                            className={cn(
                              "relative flex-1 basis-1/3 min-w-0 px-3 py-2 text-sm font-medium truncate border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                              isActive
                                ? "border-primary text-foreground bg-background"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                            )}
                            aria-pressed={isActive}
                            aria-selected={isActive}
                            aria-label={`Switch to panel ${index + 1}`}
                            role="tab"
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  {activePanel ? (
                    <div className="h-full">
                      <ResponsePanel key={activePanel.id} panel={activePanel} />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
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
            )}

            {/* Centered container for suggestions and composer */}
            <div className="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl flex flex-col gap-3 px-2 sm:px-3">
              {/* Guest quota banner */}
              {!hideAnonBanner && <AnonQuotaBanner />}
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
                  setUIState({ suggestionsUsed: true });
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
