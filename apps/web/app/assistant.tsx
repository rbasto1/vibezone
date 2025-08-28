"use client";

import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";

import { AppSidebar } from "@/components/app-sidebar";
import { Thread } from "@/components/assistant-ui/thread";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/components/ui/utils";
import { ArrowUpIcon, PlusIcon, XIcon } from "lucide-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type Provider = "openai" | "anthropic" | "gemini";

export interface PanelConfig {
  id: string;
  provider: Provider;
  model: string;
  temperature?: number;
}

const MAX_PANELS = 3;
const MIN_PANELS = 1;

// Global composer context to broadcast a prompt to all panels
type ComposerRegistry = Map<string, () => void>; // panelId -> triggerSend
const GlobalComposerContext = createContext<{
  prompt: string;
  setPrompt: (v: string) => void;
  register: (panelId: string, trigger: () => void) => void;
  unregister: (panelId: string) => void;
  triggerAll: () => void;
} | null>(null);

export const Assistant = ({
  initialPanels,
}: {
  initialPanels: PanelConfig[];
}) => {
  // Panels are now passed from a Server Component to avoid SSR/client mismatches.
  const [panels, setPanels] = useState<PanelConfig[]>(initialPanels);

  const removePanel = (id: string) => {
    setPanels((prev) => {
      if (prev.length <= MIN_PANELS) return prev;
      return prev.filter((p) => p.id !== id);
    });
  };

  // Global composer state and registry
  const [globalPrompt, setGlobalPrompt] = useState("");
  const registryRef = useRef<ComposerRegistry>(new Map());
  const register = useCallback((panelId: string, trigger: () => void) => {
    registryRef.current.set(panelId, trigger);
  }, []);
  const unregister = useCallback((panelId: string) => {
    registryRef.current.delete(panelId);
  }, []);
  const triggerAll = useCallback(() => {
    for (const [, trigger] of registryRef.current.entries()) {
      try {
        trigger();
      } catch (e) {
        console.error("Send trigger failed", e);
      }
    }
  }, []);

  const addPanel = () => {
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
  const sidebarRuntime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/api/chat/openai`,
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
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink
                    href="https://www.assistant-ui.com/docs/getting-started"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    AI Chat
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Multi Model</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <button
                className={cn(
                  "text-sm px-2 py-1 border rounded",
                  panels.length < MAX_PANELS
                    ? "hover:bg-muted"
                    : "opacity-40 cursor-not-allowed"
                )}
                onClick={addPanel}
                disabled={panels.length >= MAX_PANELS}
                aria-label="Add panel"
                title={
                  panels.length < MAX_PANELS
                    ? "Add panel"
                    : `Maximum ${MAX_PANELS} panels`
                }
              >
                Add panel
              </button>
              <ThemeToggle />
            </div>
          </header>
          <GlobalComposerContext.Provider
            value={{
              prompt: globalPrompt,
              setPrompt: setGlobalPrompt,
              register,
              unregister,
              triggerAll,
            }}
          >
            <div className="flex-1 overflow-hidden p-3 flex flex-col gap-3">
              <div
                className={cn(
                  "grid gap-3 flex-1 min-h-0 auto-rows-fr w-full",
                  gridColsClass
                )}
              >
                {panels.map((panel) =>
                  panel.provider === "openai" ? (
                    <ResponsePanelOpenAI
                      key={panel.id}
                      panel={panel}
                      canClose={panels.length > MIN_PANELS}
                      onClose={() => removePanel(panel.id)}
                    />
                  ) : (
                    <ResponsePanelPlaceholder
                      key={panel.id}
                      panel={panel}
                      canClose={panels.length > MIN_PANELS}
                      onClose={() => removePanel(panel.id)}
                    />
                  )
                )}
              </div>

              {/* Centered container for suggestions and composer */}
              <div className="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl flex flex-col gap-3 px-2 sm:px-3">
                {/* Global suggestions under panels */}
                <SuggestionsGrid onSelect={(text) => setGlobalPrompt(text)} />

                {/* Global composer below panels */}
                <GlobalComposer
                  value={globalPrompt}
                  onChange={setGlobalPrompt}
                  onSubmit={() => {
                    if (!globalPrompt.trim()) return;
                    triggerAll();
                    setGlobalPrompt("");
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

function PanelHeader({
  title,
  canClose,
  onClose,
}: {
  title: string;
  canClose: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
      <div className="font-medium truncate">{title}</div>
      <button
        className={cn(
          "p-1 rounded hover:bg-muted",
          canClose ? "opacity-100" : "opacity-40 cursor-not-allowed"
        )}
        onClick={() => canClose && onClose()}
        aria-label="Close panel"
        title={canClose ? "Close panel" : "At least one panel must remain"}
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// Hidden composer attached to each panel's runtime; listens to global prompt and can be triggered to send.
function HiddenPanelComposer({ panelId }: { panelId: string }) {
  const ctx = useContext(GlobalComposerContext);
  const sendBtnRef = useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!ctx) return;
    const trigger = () => {
      // Click the send button programmatically
      sendBtnRef.current?.click();
    };
    ctx.register(panelId, trigger);
    return () => ctx.unregister(panelId);
  }, [ctx, panelId]);

  if (!ctx) return null;

  return (
    <div className="hidden" aria-hidden>
      <div className="sr-only">Global hidden composer for panel {panelId}</div>
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Input
          value={ctx.prompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            ctx.setPrompt(e.target.value)
          }
        />
        <ComposerPrimitive.Send asChild>
          <button ref={sendBtnRef} type="button" />
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </div>
  );
}

// Suggestions grid duplicated from ThreadWelcomeSuggestions, rendered globally under panels
function SuggestionsGrid({ onSelect }: { onSelect: (text: string) => void }) {
  const items = [
    {
      title: "What are the advantages",
      label: "of using Assistant Cloud?",
      action: "What are the advantages of using Assistant Cloud?",
    },
    {
      title: "Write code to",
      label: `demonstrate topological sorting`,
      action: `Write code to demonstrate topological sorting`,
    },
    {
      title: "Help me write an essay",
      label: `about AI chat applications`,
      action: `Help me write an essay about AI chat applications`,
    },
    {
      title: "What is the weather",
      label: "in San Francisco?",
      action: "What is the weather in San Francisco?",
    },
  ];
  return (
    <div className="grid w-full gap-2 sm:grid-cols-2">
      {items.map((s, i) => (
        <button
          key={`sg-${i}`}
          className="dark:hover:bg-accent/60 h-auto w-full flex-1 flex-wrap items-start justify-start gap-1 rounded-xl border px-4 py-3.5 text-left text-sm sm:flex-col"
          onClick={() => onSelect(s.action)}
        >
          <span className="font-medium">{s.title}</span>
          <p className="text-muted-foreground">{s.label}</p>
        </button>
      ))}
    </div>
  );
}

function GlobalComposer({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="bg-background relative flex w-full flex-col gap-4 pb-4 md:pb-6">
      {/* Input box (top section) */}
      <textarea
        placeholder="Send a message to all panels..."
        className="bg-muted border-border dark:border-muted-foreground/15 focus:outline-primary placeholder:text-muted-foreground max-h-[calc(50dvh)] min-h-16 w-full resize-none rounded-t-2xl border-x border-t px-4 pt-2 pb-3 text-base outline-none"
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {/* Footer with attach and send, styled like thread composer */}
      <div className="bg-muted border-border dark:border-muted-foreground/15 relative flex items-center justify-between rounded-b-2xl border-x border-b p-2">
        <Button
          type="button"
          variant="ghost"
          className="hover:bg-foreground/15 dark:hover:bg-background/50 scale-115 p-3.5"
          onClick={() => console.warn("Attachment clicked - not implemented")}
          aria-label="Attach file"
        >
          <PlusIcon />
        </Button>

        <Button
          type="button"
          className="dark:border-muted-foreground/90 border-muted-foreground/60 hover:bg-primary/75 size-8 rounded-full border cursor-pointer"
          onClick={onSubmit}
          aria-label="Send to all panels"
        >
          <ArrowUpIcon className="size-5" />
        </Button>
      </div>
    </div>
  );
}

function ResponsePanelOpenAI({
  panel,
  onClose,
  canClose,
}: {
  panel: PanelConfig;
  onClose: () => void;
  canClose: boolean;
}) {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_LLM_WORKER_URL}/api/chat/openai`,
      body: {
        config: {
          model: panel.model,
          temperature: panel.temperature ?? 0.1,
        },
      },
    }),
  });

  const headerTitle = useMemo(() => {
    if (panel.model === "gpt-4o") return "GPT-4o";
    return `${panel.model}`;
  }, [panel.model]);

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden h-full">
      <PanelHeader title={headerTitle} canClose={canClose} onClose={onClose} />
      <div className="flex-1 min-h-0">
        <AssistantRuntimeProvider runtime={runtime}>
          {/* Thread without visible composer; hello message remains within thread */}
          <Thread hideComposer />
          {/* Hidden per-panel composer to receive broadcasted submit */}
          <HiddenPanelComposer panelId={panel.id} />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}

function ResponsePanelPlaceholder({
  panel,
  onClose,
  canClose,
}: {
  panel: PanelConfig;
  onClose: () => void;
  canClose: boolean;
}) {
  const headerTitle = useMemo(() => {
    if (
      panel.provider === "anthropic" &&
      panel.model.startsWith("claude-3-5")
    ) {
      return "Claude 3.5 Sonnet";
    }
    return `${panel.model}`;
  }, [panel.model, panel.provider]);

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden h-full">
      <PanelHeader title={headerTitle} canClose={canClose} onClose={onClose} />
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-4">
        {panel.provider === "anthropic"
          ? "Claude streaming coming soon"
          : "Provider not yet supported"}
      </div>
    </div>
  );
}
