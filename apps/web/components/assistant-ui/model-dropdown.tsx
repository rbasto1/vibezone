"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { modelsAtom } from "@/store/models";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAtomValue } from "jotai";
import {
  Brain,
  ChevronDown,
  Crown,
  Eye,
  FileText,
  Gauge,
  Image as ImageIcon,
  Mountain,
  Wand2,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type FC } from "react";
import { ProviderIcon } from "../ui/providers/provider";

interface ModelDropdownProps {
  modelId: string;
  onChangeModel: (providerId: string, modelId: string) => void;
}

export const ModelDropdown: FC<ModelDropdownProps> = ({
  modelId,
  onChangeModel,
}) => {
  const state = useAtomValue(modelsAtom);
  const models = state.models;
  const providers = state.providers;
  const model = models.find((m) => m.id === modelId);
  const provider = providers.find((p) => p.id === model?.providerId);

  // Filters: provider tiers and model flags
  const tierOptions = [
    { id: "leaders" as const, label: "Leaders", Icon: Crown },
    { id: "challengers" as const, label: "Challengers", Icon: Mountain },
    { id: "specialists" as const, label: "Specialists", Icon: Wand2 },
  ];
  const capabilityOptions = [
    { id: "capabilityFast" as const, label: "Fast", Icon: Zap },
    { id: "capabilityVision" as const, label: "Can see images", Icon: Eye },
    { id: "capabilityPdf" as const, label: "Can read PDFs", Icon: FileText },
    { id: "capabilityReasoning" as const, label: "Reasoning", Icon: Brain },
    {
      id: "capabilityImageGeneration" as const,
      label: "Can generate images",
      Icon: ImageIcon,
    },
    { id: "capabilityTools" as const, label: "Tools Use", Icon: Wrench },
    {
      id: "capabilityEffortControl" as const,
      label: "Effort Control",
      Icon: Gauge,
    },
  ];

  // Icon color per capability (stroke inherits currentColor)
  const capabilityColor: Record<
    (typeof capabilityOptions)[number]["id"],
    string
  > = {
    capabilityFast: "text-amber-600 dark:text-amber-400",
    capabilityVision: "text-sky-600 dark:text-sky-400",
    capabilityPdf: "text-emerald-600 dark:text-emerald-400",
    capabilityReasoning: "text-violet-600 dark:text-violet-400",
    capabilityImageGeneration: "text-pink-600 dark:text-pink-400",
    capabilityTools: "text-zinc-600 dark:text-zinc-400",
    capabilityEffortControl: "text-indigo-600 dark:text-indigo-400",
  };

  // Icon color per tier
  const tierColor: Record<(typeof tierOptions)[number]["id"], string> = {
    leaders: "text-yellow-400 dark:text-yellow-300",
    challengers: "text-foreground/80",
    specialists: "text-foreground/80",
  };

  // Exclusive tier selection (default: leaders, with fallback if unavailable)
  const [selectedTier, setSelectedTier] = useState<
    "leaders" | "challengers" | "specialists"
  >("leaders");
  const [selectedCapabilities, setSelectedCapabilities] = useState<
    Set<(typeof capabilityOptions)[number]["id"]>
  >(new Set());

  // Ensure we always show something even if no providers in the default tier
  useEffect(() => {
    if (!providers.length) return;
    const hasInSelected = providers.some((p) => p.tier === selectedTier);
    if (!hasInSelected) {
      const order: (typeof tierOptions)[number]["id"][] = [
        "leaders",
        "challengers",
        "specialists",
      ];
      const next = order.find((t) => providers.some((p) => p.tier === t));
      if (next && next !== selectedTier) setSelectedTier(next);
    }
  }, [providers, selectedTier]);

  const toggleCapability = (cap: (typeof capabilityOptions)[number]["id"]) => {
    setSelectedCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
  };

  const providersByTier = useMemo(() => {
    return providers.filter((p) => p.tier === selectedTier);
  }, [providers, selectedTier]);
  const modelsByProvider = useMemo(() => {
    // Precompute per provider
    const byProvider = new Map<string, typeof models>();
    const hasCapabilityFilters = selectedCapabilities.size > 0;
    for (const p of providersByTier) {
      const list = models.filter((m) => m.providerId === p.id);
      const filtered = hasCapabilityFilters
        ? list.filter((m) => {
            // AND semantics: model must match ALL selected capabilities
            for (const cap of selectedCapabilities) {
              if (!m[cap]) return false;
            }
            return true;
          })
        : list;
      // Sort by priority desc (if present), then name asc
      filtered.sort((a, b) => {
        const ap = a.priority ?? -Infinity;
        const bp = b.priority ?? -Infinity;
        if (ap !== bp) return bp - ap;
        return a.name.localeCompare(b.name);
      });
      byProvider.set(p.id, filtered);
    }
    return byProvider;
  }, [models, providersByTier, selectedCapabilities]);

  // Track which providers have expanded "Other models"
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    new Set()
  );

  // Compute which providers should be auto-expanded based on current filters
  const autoExpandedProviders = useMemo(() => {
    const autoExpanded = new Set<string>();

    for (const p of providersByTier) {
      const list = modelsByProvider.get(p.id) ?? [];
      const suggested = list.filter((m) => m.isSuggested);
      const others = list.filter((m) => !m.isSuggested);

      // Auto-expand if no suggested models are visible but other models exist
      if (suggested.length === 0 && others.length > 0) {
        autoExpanded.add(p.id);
      }
    }

    return autoExpanded;
  }, [providersByTier, modelsByProvider]);

  // Combine manual expansion with auto-expansion
  const effectiveExpandedProviders = useMemo(() => {
    const combined = new Set(expandedProviders);
    for (const providerId of autoExpandedProviders) {
      combined.add(providerId);
    }
    return combined;
  }, [expandedProviders, autoExpandedProviders]);

  const toggleProviderExpanded = (providerId: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex items-center gap-2 text-lg px-3 py-0.5 rounded border hover:bg-muted/70 text-foreground/80 hover:text-foreground transition-colors font-medium"
          title="Change model"
        >
          <span className="flex items-center gap-2 truncate max-w-[50vw]">
            {provider && <ProviderIcon providerId={provider.id} />}
            <span className="truncate">{model?.name ?? modelId}</span>
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className={cn(
            // Large panel on desktop, full-screen on mobile
            "z-50 bg-popover text-popover-foreground shadow-md",
            // Mobile default: full-screen
            "w-screen h-[100dvh] rounded-none border-0",
            // Desktop/tablet: large contained panel
            "sm:w-[min(1200px,calc(100vw-2rem))] sm:h-[min(80vh,700px)] sm:rounded-md sm:border",
            "max-w-[100vw] max-h-[100vh] p-3"
          )}
        >
          <div className="flex h-full flex-col">
            {/* Filters */}
            <div className="flex items-center gap-6 pb-3 border-b mb-3 shrink-0">
              {/* Segmented tier control */}
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-md border bg-muted p-0.5">
                  {tierOptions.map(({ id, label, Icon }) => {
                    const active = selectedTier === id;
                    return (
                      <button
                        key={id}
                        className={cn(
                          "px-3 h-8 text-xs inline-flex items-center gap-1.5 rounded-[6px] cursor-pointer",
                          "transition-colors",
                          active
                            ? "bg-background shadow-sm"
                            : "text-foreground/80"
                        )}
                        data-active={active}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedTier(id);
                        }}
                      >
                        <Icon className={cn("size-4", tierColor[id])} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Capability filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {capabilityOptions.map(({ id, label, Icon }) => {
                  const active = selectedCapabilities.has(id);
                  return (
                    <Button
                      key={id}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      title={label}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCapability(id);
                      }}
                    >
                      <Icon className="size-4" />
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Providers as columns with horizontal scroll */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              {providersByTier.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                  No providers available for the selected filters.
                </div>
              ) : (
                <div className="flex gap-4 min-w-full">
                  {providersByTier.map((p) => {
                    const list = modelsByProvider.get(p.id) ?? [];
                    const suggested = list.filter((m) => m.isSuggested);
                    const others = list.filter((m) => !m.isSuggested);
                    const expanded = effectiveExpandedProviders.has(p.id);
                    const hasModels = list.length > 0;

                    return (
                      <div
                        key={p.id}
                        className="min-w-[220px] max-w-[280px] shrink-0 border rounded-md p-2"
                      >
                        <div className="px-1 pb-2 mb-2 border-b">
                          <div className="text-xs tracking-wide text-muted-foreground flex items-center gap-2">
                            <ProviderIcon providerId={p.id} />
                            <span className="font-medium">{p.name}</span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          {!hasModels ? (
                            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                              No models match the filters
                            </div>
                          ) : (
                            <>
                              {suggested.map((m) => (
                                <DropdownMenu.Item
                                  key={m.id}
                                  className={cn(
                                    "cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none",
                                    "focus:bg-accent focus:text-accent-foreground",
                                    m.id === modelId
                                      ? "bg-accent/50 font-semibold"
                                      : "font-medium"
                                  )}
                                  onSelect={() => onChangeModel(p.id, m.id)}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="flex-1 min-w-0">
                                      <div className="truncate">{m.name}</div>
                                      <div className="mt-0.5 flex items-center gap-1">
                                        {capabilityOptions
                                          .filter((c) =>
                                            Boolean(
                                              (m as Record<string, unknown>)[
                                                c.id
                                              ]
                                            )
                                          )
                                          .map(({ id, Icon }) => (
                                            <Icon
                                              key={id}
                                              className={cn(
                                                "h-3 w-3 opacity-85",
                                                capabilityColor[id]
                                              )}
                                              strokeWidth={2}
                                            />
                                          ))}
                                      </div>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      {m.isIncluded ? (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                                          Included
                                        </span>
                                      ) : null}
                                      {m.isPremium ? (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                          Premium
                                        </span>
                                      ) : null}
                                      {m.isNew ? (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-800 dark:text-blue-300">
                                          New
                                        </span>
                                      ) : null}
                                      {m.isExperimental ? (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300">
                                          Experimental
                                        </span>
                                      ) : null}
                                    </span>
                                  </div>
                                </DropdownMenu.Item>
                              ))}

                              {others.length > 0 && !expanded ? (
                                <button
                                  className="mt-1 text-xs text-muted-foreground hover:text-foreground text-left px-2 py-1"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleProviderExpanded(p.id);
                                  }}
                                >
                                  Show more
                                </button>
                              ) : null}

                              {others.length > 0 && expanded ? (
                                <div className="mt-2">
                                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 mb-1">
                                    Other models
                                  </div>
                                  {others.map((m) => (
                                    <DropdownMenu.Item
                                      key={m.id}
                                      className={cn(
                                        "cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none",
                                        "focus:bg-accent focus:text-accent-foreground",
                                        m.id === modelId
                                          ? "bg-accent/50 font-semibold"
                                          : "font-medium"
                                      )}
                                      onSelect={() => onChangeModel(p.id, m.id)}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="flex-1 min-w-0">
                                          <div className="truncate">
                                            {m.name}
                                          </div>
                                          <div className="mt-0.5 flex items-center gap-1">
                                            {capabilityOptions
                                              .filter((c) =>
                                                Boolean(
                                                  (
                                                    m as Record<string, unknown>
                                                  )[c.id]
                                                )
                                              )
                                              .map(({ id, Icon }) => (
                                                <Icon
                                                  key={id}
                                                  className={cn(
                                                    "h-3 w-3 opacity-85",
                                                    capabilityColor[id]
                                                  )}
                                                  strokeWidth={2}
                                                />
                                              ))}
                                          </div>
                                        </span>
                                        <span className="flex items-center gap-1">
                                          {m.isIncluded ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                                              Included
                                            </span>
                                          ) : null}
                                          {m.isPremium ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                              Premium
                                            </span>
                                          ) : null}
                                          {m.isNew ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-800 dark:text-blue-300">
                                              New
                                            </span>
                                          ) : null}
                                          {m.isExperimental ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300">
                                              Experimental
                                            </span>
                                          ) : null}
                                        </span>
                                      </div>
                                    </DropdownMenu.Item>
                                  ))}
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
