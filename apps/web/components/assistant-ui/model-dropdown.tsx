"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { modelsAtom } from "@/store/models";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAtomValue } from "jotai";
import { ChevronDown, Crown, Mountain, Wand2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState, type FC } from "react";
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
    { id: "capability_fast" as const, label: "Fast" },
    { id: "capability_vision" as const, label: "Vision" },
    { id: "capability_pdf" as const, label: "PDF" },
    { id: "capability_reasoning" as const, label: "Reasoning" },
    { id: "capability_image_generation" as const, label: "Image Gen" },
    { id: "capability_tools" as const, label: "Tools" },
    { id: "capability_effort_control" as const, label: "Effort" },
  ];

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
            // OR semantics across selected capabilities
            for (const cap of selectedCapabilities) {
              if (m[cap]) return true;
            }
            return false;
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
            <div className="flex flex-col gap-3 pb-3 border-b mb-3 shrink-0">
              {/* Segmented tier control */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Tier:
                </span>
                <div className="inline-flex rounded-md border bg-muted p-0.5">
                  {tierOptions.map(({ id, label, Icon }) => {
                    const active = selectedTier === id;
                    return (
                      <button
                        key={id}
                        className={cn(
                          "px-3 h-8 text-xs inline-flex items-center gap-1.5 rounded-[6px]",
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
                        <Icon className="size-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Capability filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">
                  Capabilities:
                </span>
                {capabilityOptions.map(({ id, label }) => {
                  const active = selectedCapabilities.has(id);
                  return (
                    <Button
                      key={id}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-2 py-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCapability(id);
                      }}
                    >
                      <span className="text-xs">{label}</span>
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
              ) : null}
              <div className="flex gap-4 min-w-full">
                {providersByTier.map((p) => {
                  const list = modelsByProvider.get(p.id) ?? [];
                  if (!list.length) return <Fragment key={p.id} />;
                  return (
                    <div
                      key={p.id}
                      className="min-w-[220px] max-w-[280px] shrink-0 border rounded-md p-2"
                    >
                      <div className="px-1 pb-2 mb-2 border-b">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                          <ProviderIcon providerId={p.id} />
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        {list.map((m) => (
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
                              <span className="truncate">{m.name}</span>
                              <span className="flex items-center gap-1">
                                {m.is_included ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                                    Included
                                  </span>
                                ) : null}
                                {m.is_premium ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                    Premium
                                  </span>
                                ) : null}
                                {m.is_new ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-800 dark:text-blue-300">
                                    New
                                  </span>
                                ) : null}
                                {m.is_experimental ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300">
                                    Experimental
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          </DropdownMenu.Item>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
