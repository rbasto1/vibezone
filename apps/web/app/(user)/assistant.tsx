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
import Link from "next/link";
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
  const [focusPanelId, setFocusPanelId] = useState<string>();

  const ctx = useContext(GlobalComposerContext);
  if (!ctx) throw new Error("GlobalComposerContext is not available");

  const { prompt, setPrompt, send, getRuntimes } = ctx;

  useEffect(() => {
    if (isMobile) {
      setFocusPanelId((current) => {
        if (current && panelsConfig.some((panel) => panel.id === current)) {
          return current;
        }

        return panelsConfig[0]?.id;
      });
      return;
    }

    setFocusPanelId((current) => {
      if (!current) return undefined;
      const exists = panelsConfig.some((panel) => panel.id === current);
      if (!exists || panelsConfig.length <= 1) {
        return undefined;
      }
      return current;
    });
  }, [isMobile, panelsConfig]);

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
    if (!allowedModelIds.length) {
      toast.error("No available models for guests. Please sign in.");
      return;
    }

    setPanelsConfig(
      allowedModelIds.slice(0, 3).map((modelId, order): PanelConfig => {
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
  const showTabs = isMobile && panelsConfig.length > 1;
  const hideAnonBanner = isMobile && uiState.suggestionsUsed;
  const canToggleFocus = !isMobile && panelsConfig.length > 1;

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
                      const isActive = focusPanelId === panel.id;
                      const isRunning = panelsState[panel.id]?.running;
                      return (
                        <div
                          className={cn(
                            "relative flex-1 basis-1/3 min-w-0",
                            isActive
                              ? "border-b-2 border-primary"
                              : "border-b-2 border-transparent hover:border-border"
                          )}
                        >
                          <button
                            key={panel.id}
                            type="button"
                            onClick={() => setFocusPanelId(panel.id)}
                            className={cn(
                              "relative w-full h-full px-3 py-2 text-sm font-medium truncate transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                              isActive
                                ? "text-foreground bg-background"
                                : "text-muted-foreground hover:text-foreground",
                              isRunning && "panel-button-glow"
                            )}
                            aria-pressed={isActive}
                            aria-selected={isActive}
                            aria-label={`Switch to panel ${index + 1}`}
                            role="tab"
                          >
                            <span className="text">{label}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div
                className={cn(
                  "flex-1 min-h-0",
                  !isMobile && "grid gap-3  auto-rows-fr w-full",
                  !isMobile && panelCount === 1 && "grid-cols-1",
                  !isMobile && panelCount === 2 && "md:grid-cols-2",
                  !isMobile && panelCount === 3 && "md:grid-cols-3"
                )}
              >
                {panelsConfig.map((panel) => {
                  const isFocused = focusPanelId === panel.id;
                  const isDimmed =
                    Boolean(focusPanelId) && focusPanelId !== panel.id;
                  return (
                    <ResponsePanel
                      key={panel.id}
                      panel={panel}
                      isFocused={isFocused}
                      onToggleFocus={
                        canToggleFocus
                          ? () =>
                              setFocusPanelId((current) =>
                                current === panel.id ? undefined : panel.id
                              )
                          : undefined
                      }
                      className={cn(
                        "transition-all duration-300",
                        isDimmed && "hidden",
                        isFocused && "md:col-span-full"
                      )}
                    />
                  );
                })}
              </div>
            </div>

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
            <div className="flex justify-center text-xs gap-4 [&>a]:underline">
              <span>
                AI can make mistakes. Always check important responses
                independently.
              </span>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Use</Link>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
