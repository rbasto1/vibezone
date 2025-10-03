"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";

import { AnonQuotaBanner } from "@/components/assistant-ui/anon-quota-banner";
import { AssistantHeader } from "@/components/assistant-ui/assistant-header";
import { GlobalComposer } from "@/components/assistant-ui/global-composer";
import { ResponsePanel } from "@/components/assistant-ui/response-panel";
import { ThreadWelcomeSuggestions } from "@/components/assistant-ui/thread-welcome-suggestions";
import { GlobalComposerProvider } from "@/components/providers/global-composer-provider";
import { ClientOnly } from "@/components/ui/client-only";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/components/ui/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModelsValue } from "@/hooks/use-models";
import { usePanelsConfig, usePanelsStateValue } from "@/hooks/use-panels";
import { useUIState } from "@/hooks/use-ui-state";
import { useUser } from "@/lib/auth-client";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import type { PanelConfig } from "@/store/panels";
import { AppSidebarLoader } from "./app-sidebar-loader";
import PreferencesPage from "./preferences";

const Assistant: FC = () => {
  return (
    <GlobalComposerProvider>
      <AssistantContent />
    </GlobalComposerProvider>
  );
};

const AssistantContent: FC = () => {
  const t = useTranslations("Assistant");
  const [panelsConfig, setPanelsConfig] = usePanelsConfig();
  const panelsState = usePanelsStateValue();
  const [uiState, setUIState] = useUIState();
  const { user } = useUser();
  const panelModelIds = useMemo(
    () => panelsConfig.map((panel) => panel.model),
    [panelsConfig]
  );
  const { models } = useModelsValue({ includeModels: panelModelIds });
  const isMobile = useIsMobile();
  const [focusPanelId, setFocusPanelId] = useState<string>();

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

  const handleSelectModelsGroup = (modelIds: string[]) => {
    // If anonymous, filter out premium/included models
    const allowedModelIds = user
      ? modelIds
      : modelIds.filter((id) => {
          const m = models.find((mm) => mm.id === id);
          return m && !m.isPremium && !m.isIncluded;
        });

    if (!allowedModelIds.length) {
      setUIState({ loginOpen: true });
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
  const modelNamesById = useMemo(() => {
    const entries = new Map<string, string>();
    for (const model of models) {
      entries.set(model.id, model.name);
    }
    return entries;
  }, [models]);
  const showTabs = isMobile && panelsConfig.length > 1;
  const hideAnonBanner = !!user || (isMobile && uiState.suggestionsUsed);
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
          {uiState.preferencesOpen && <PreferencesPage />}
          <div
            className={cn(
              "flex-1 overflow-hidden p-3 flex flex-col gap-3",
              uiState.preferencesOpen && "hidden"
            )}
          >
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
                      const label = t("panelTabLabel", {
                        index: index + 1,
                        modelName: modelLabel,
                      });
                      const isActive = focusPanelId === panel.id;
                      const isRunning = panelsState[panel.id]?.running;
                      return (
                        <div
                          key={panel.id}
                          className={cn(
                            "relative flex-1 basis-1/3 min-w-0",
                            isActive
                              ? "border-b-2 border-primary"
                              : "border-b-2 border-transparent hover:border-border"
                          )}
                        >
                          <button
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
                            aria-label={t("panelAriaLabel", {
                              index: index + 1,
                            })}
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
              {!hideAnonBanner && (
                <ClientOnly>
                  <AnonQuotaBanner />
                </ClientOnly>
              )}
              {/* Global suggestions under panels - only show if not used */}
              {!uiState.suggestionsUsed && (
                <ThreadWelcomeSuggestions onSelect={handleSelectModelsGroup} />
              )}
              {/* Global composer below panels */}
              <GlobalComposer panelsState={panelsState} />
            </div>
            <div className="flex justify-center text-xs gap-4 [&>a]:underline">
              <span>{t("aiDisclaimer")}</span>
              <Link href="/privacy">{t("privacyPolicy")}</Link>
              <Link href="/terms">{t("termsOfUse")}</Link>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Assistant;
