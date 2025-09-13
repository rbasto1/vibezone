"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import { useModelsValue } from "@/hooks/use-models";
import { useEffect, useMemo, useState } from "react";
import { ProviderIcon } from "../ui/providers/provider";
import {
  capabilityOptions,
  tierColor,
  tierOptions,
  tierOptionsOrder,
} from "./model-dropdown-constants";
import { ModelDropdownItem } from "./model-dropdown-item";
import { ModelDropdownSearch } from "./model-dropdown-search";
import { ModelDropdownSuggestionGroup } from "./model-dropdown-suggestion-group";

interface ModelDropdownContentsProps {
  onSelect: (providerId: string, modelId: string) => void;
  currentModelId?: string;
  onClose?: () => void;
}

export const ModelDropdownContents: React.FC<ModelDropdownContentsProps> = ({
  onSelect,
  currentModelId,
  onClose,
}) => {
  const { models, providers } = useModelsValue();
  const { groups: suggestionGroups } = useModelsValue();

  // Exclusive selection between tiers and suggestion groups
  const [selectedTier, setSelectedTier] = useState<
    "leaders" | "challengers" | "specialists" | null
  >("leaders");
  const [selectedSuggestionGroup, setSelectedSuggestionGroup] = useState<
    string | null
  >(null);
  const [selectedCapabilities, setSelectedCapabilities] = useState<
    Set<(typeof capabilityOptions)[number]["id"]>
  >(new Set());

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Ensure we always show something even if no providers in the default tier
  useEffect(() => {
    if (!providers.length || selectedSuggestionGroup || searchQuery.trim())
      return;
    const hasInSelected =
      selectedTier && providers.some((p) => p.tier === selectedTier);
    if (!hasInSelected) {
      const next = tierOptionsOrder.find((t) =>
        providers.some((p) => p.tier === t)
      );
      if (next && next !== selectedTier) setSelectedTier(next);
    }
  }, [providers, selectedTier, selectedSuggestionGroup, searchQuery]);

  const toggleCapability = (cap: (typeof capabilityOptions)[number]["id"]) => {
    setSelectedCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
  };

  const handleTierSelect = (
    tier: "leaders" | "challengers" | "specialists"
  ) => {
    setSelectedTier(tier);
    setSelectedSuggestionGroup(null);
    setSearchQuery("");
  };

  // Handler that selects model and closes dropdown
  const handleModelSelect = (providerId: string, modelId: string) => {
    onSelect(providerId, modelId);
    onClose?.();
  };

  // Handler for suggestion group selection
  const handleSuggestionGroupSelect = (groupId: string) => {
    setSelectedSuggestionGroup(groupId);
    setSearchQuery("");
  };

  const providersByTier = useMemo(() => {
    // If search is active, filter providers by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return providers.filter((p) => {
        // Check if provider name matches
        if (p.name.toLowerCase().includes(query)) return true;

        // Check if any of the provider's models match
        const providerModels = models.filter((m) => m.providerId === p.id);
        return providerModels.some((m) => m.name.toLowerCase().includes(query));
      });
    }

    if (selectedSuggestionGroup) {
      // When a suggestion group is selected, get providers for models in that group
      const groupModels = models.filter((m) =>
        m.groups?.has(selectedSuggestionGroup)
      );
      const providerIds = new Set(groupModels.map((m) => m.providerId));
      return providers.filter((p) => providerIds.has(p.id));
    }
    return selectedTier ? providers.filter((p) => p.tier === selectedTier) : [];
  }, [providers, selectedTier, selectedSuggestionGroup, models, searchQuery]);

  const modelsByProvider = useMemo(() => {
    // Precompute per provider
    const byProvider = new Map<string, typeof models>();
    const hasCapabilityFilters = selectedCapabilities.size > 0;
    const hasSearchQuery = searchQuery.trim();

    for (const p of providersByTier) {
      let list = models.filter((m) => m.providerId === p.id);

      // If a suggestion group is selected, filter to only models in that group
      if (selectedSuggestionGroup) {
        list = list.filter((m) => m.groups?.has(selectedSuggestionGroup));
      }

      // If search is active, filter models by search query
      if (hasSearchQuery) {
        const query = searchQuery.toLowerCase().trim();
        list = list.filter(
          (m) =>
            m.provider.name.toLowerCase().includes(query) ||
            m.name.toLowerCase().includes(query)
        );
      }

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
  }, [
    models,
    providersByTier,
    selectedCapabilities,
    selectedSuggestionGroup,
    searchQuery,
  ]);

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

  const effectiveSelectedTier =
    selectedSuggestionGroup || searchQuery.trim() ? null : selectedTier;
  const effectiveSelectedSuggestionGroup = searchQuery.trim()
    ? null
    : selectedSuggestionGroup;

  return (
    <DropdownMenuContent
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
          {/* Segmented tier control with suggestion groups */}
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-md border bg-muted p-0.5">
              {/* Main tier options */}
              {tierOptions.map(({ id, label, Icon }) => {
                const active = effectiveSelectedTier === id;
                return (
                  <button
                    key={id}
                    className={cn(
                      "px-3 h-8 text-xs inline-flex items-center gap-1.5 rounded-[6px] cursor-pointer",
                      "transition-colors",
                      active ? "bg-background shadow-sm" : "text-foreground/80"
                    )}
                    data-active={active}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleTierSelect(id);
                    }}
                  >
                    <Icon className={cn("size-4", tierColor[id])} />
                    {label}
                  </button>
                );
              })}

              {/* Vertical separator */}
              {suggestionGroups && suggestionGroups.length > 0 && (
                <div className="w-px h-8 bg-border mx-1" />
              )}

              {/* Suggestion Groups */}
              {suggestionGroups && suggestionGroups.length > 0 && (
                <>
                  {suggestionGroups.map((group) => (
                    <ModelDropdownSuggestionGroup
                      key={group.id}
                      group={group}
                      isActive={effectiveSelectedSuggestionGroup === group.id}
                      onSelect={handleSuggestionGroupSelect}
                    />
                  ))}
                </>
              )}
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

          {/* Search input */}
          <ModelDropdownSearch
            onSearchChange={setSearchQuery}
            onSearchFocusChange={setIsSearchFocused}
            searchQuery={searchQuery}
            isSearchFocused={isSearchFocused}
          />
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
                      {!list.length ? (
                        <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                          No models match the filters
                        </div>
                      ) : (
                        <>
                          {suggested.map((m) => (
                            <ModelDropdownItem
                              key={m.id}
                              model={m}
                              currentModelId={currentModelId}
                              onSelect={handleModelSelect}
                              providerId={p.id}
                            />
                          ))}

                          {others.length > 0 && !expanded && (
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
                          )}

                          {others.length > 0 && expanded && (
                            <div className="mt-2">
                              <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 mb-1">
                                Other models
                              </div>
                              {others.map((m) => (
                                <ModelDropdownItem
                                  key={m.id}
                                  model={m}
                                  currentModelId={currentModelId}
                                  onSelect={handleModelSelect}
                                  providerId={p.id}
                                />
                              ))}
                            </div>
                          )}
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
    </DropdownMenuContent>
  );
};
