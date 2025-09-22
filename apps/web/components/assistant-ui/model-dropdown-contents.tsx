"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { ProviderIcon } from "@/components/ui/providers/provider";
import { cn } from "@/components/ui/utils";
import type { ProviderTier } from "@/db";
import { useModelsValue } from "@/hooks/use-models";
import { useSession } from "@/hooks/use-session";
import { useEffect, useMemo, useState } from "react";
import { capabilityOptions, tierOptions } from "./model-dropdown-constants";
import { ModelDropdownItem } from "./model-dropdown-item";
import { ModelDropdownSearch } from "./model-dropdown-search";
import { ModelDropdownSuggestionGroup } from "./model-dropdown-suggestion-group";

interface ModelDropdownContentsProps {
  onSelect: (providerId: string, modelId: string) => void;
  currentModelId?: string;
  onClose?: () => void;
  variant?: "dropdown" | "sheet";
}

export const ModelDropdownContents: React.FC<ModelDropdownContentsProps> = ({
  onSelect,
  currentModelId,
  onClose,
  variant = "dropdown",
}) => {
  const { models, providers } = useModelsValue();
  const { groups: suggestionGroups } = useModelsValue();
  const session = useSession();

  // Exclusive selection between tiers and suggestion groups
  const [selectedTier, setSelectedTier] = useState<ProviderTier | null>(
    () =>
      providers.find((p) => p.id === currentModelId?.split("/")[0])?.tier ??
      tierOptions[0]?.id ??
      null
  );
  const [selectedSuggestionGroup, setSelectedSuggestionGroup] =
    useState<string>();
  const [selectedCapabilities, setSelectedCapabilities] = useState(
    new Set<(typeof capabilityOptions)[number]["id"]>()
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const isSheet = variant === "sheet";

  // Ensure we always show something even if no providers in the default tier
  useEffect(() => {
    if (!providers.length || selectedSuggestionGroup || searchQuery.trim())
      return;
    const hasInSelected =
      selectedTier && providers.some((p) => p.tier === selectedTier);
    if (!hasInSelected) {
      const next = tierOptions.find(({ id }) =>
        providers.some((p) => p.tier === id)
      )?.id;
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
    setSelectedSuggestionGroup(undefined);
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
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return providers.filter((p) => {
        if (p.name.toLowerCase().includes(query)) return true;
        const providerModels = models.filter((m) => m.providerId === p.id);
        return providerModels.some((m) => m.name.toLowerCase().includes(query));
      });
    }

    if (selectedSuggestionGroup) {
      const groupModels = suggestionGroups.find(
        (g) => g.id === selectedSuggestionGroup
      )?.models;
      const providerIds = new Set(groupModels?.map((m) => m.split("/")[0]));
      return providers.filter((p) => providerIds.has(p.id));
    }

    return selectedTier ? providers.filter((p) => p.tier === selectedTier) : [];
  }, [
    models,
    providers,
    searchQuery,
    selectedSuggestionGroup,
    selectedTier,
    suggestionGroups,
  ]);

  const modelsByProvider = useMemo(() => {
    const byProvider = new Map<string, typeof models>();
    const hasCapabilityFilters = selectedCapabilities.size > 0;
    const hasSearchQuery = searchQuery.trim();

    for (const p of providersByTier) {
      let list = models.filter((m) => m.providerId === p.id);

      if (selectedSuggestionGroup) {
        list = list.filter((m) =>
          suggestionGroups
            .find((g) => g.id === selectedSuggestionGroup)
            ?.models.includes(m.id)
        );
      }

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
            for (const cap of selectedCapabilities) {
              if (!m[cap]) return false;
            }
            return true;
          })
        : list;

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
    searchQuery,
    selectedCapabilities,
    selectedSuggestionGroup,
    suggestionGroups,
  ]);

  const [expandedProviders, setExpandedProviders] = useState(new Set<string>());

  const autoExpandedProviders = useMemo(() => {
    const autoExpanded = new Set<string>();

    for (const p of providersByTier) {
      const list = modelsByProvider.get(p.id) ?? [];
      const suggested = list.filter((m) => m.isSuggested);
      const others = list.filter((m) => !m.isSuggested);

      if (suggested.length === 0 && others.length > 0) {
        autoExpanded.add(p.id);
      }
    }

    return autoExpanded;
  }, [providersByTier, modelsByProvider]);

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

  const sheetFilters = (
    <div className="mb-3 flex w-full flex-col gap-1 px-1">
      <div className="flex w-full flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-md border bg-muted p-0.5">
          {tierOptions.map(({ id, label, Icon, color }) => {
            const active = effectiveSelectedTier === id;
            return (
              <button
                key={id}
                className={cn(
                  "px-3 h-8 text-xs inline-flex items-center gap-1.5 rounded-[6px] cursor-pointer transition-colors",
                  active ? "bg-background shadow-sm" : "text-foreground/80"
                )}
                data-active={active}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTierSelect(id);
                }}
              >
                <Icon className={cn("size-4", color)} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {suggestionGroups.length > 0 && (
        <div className="flex w-full flex-wrap items-center gap-2">
          {suggestionGroups.map((group) => (
            <ModelDropdownSuggestionGroup
              key={group.id}
              group={group}
              isActive={effectiveSelectedSuggestionGroup === group.id}
              onSelect={handleSuggestionGroupSelect}
            />
          ))}
        </div>
      )}

      <div className="flex w-full flex-wrap items-center gap-2">
        {capabilityOptions.map(({ id, label, Icon, color }) => {
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
              <Icon className={cn("size-4", color)} />
            </Button>
          );
        })}
      </div>

      <ModelDropdownSearch
        onSearchChange={setSearchQuery}
        onSearchFocusChange={setIsSearchFocused}
        searchQuery={searchQuery}
        isSearchFocused={isSearchFocused}
        className="w-full"
        inputClassName="w-full"
      />
    </div>
  );

  const desktopFilters = (
    <div className="flex items-center gap-6 pb-3 border-b mb-3 shrink-0">
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-md border bg-muted p-0.5">
          {tierOptions.map(({ id, label, Icon, color }) => {
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
                <Icon className={cn("size-4", color)} />
                {label}
              </button>
            );
          })}

          {suggestionGroups.length > 0 && (
            <>
              <div className="w-px h-8 bg-border mx-1" />
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

      <div className="flex items-center gap-2 flex-wrap">
        {capabilityOptions.map(({ id, label, Icon, color }) => {
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
              <Icon className={cn("size-4", color)} />
            </Button>
          );
        })}
      </div>

      <ModelDropdownSearch
        onSearchChange={setSearchQuery}
        onSearchFocusChange={setIsSearchFocused}
        searchQuery={searchQuery}
        isSearchFocused={isSearchFocused}
      />
    </div>
  );

  const body = (
    <div className="flex h-full flex-col">
      {isSheet ? sheetFilters : desktopFilters}

      <div className="flex-1 overflow-hidden">
        {providersByTier.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
            No providers available for the selected filters.
          </div>
        ) : (
          <div
            className={
              "flex min-w-full gap-4 overflow-x-auto pb-2 h-full items-start"
            }
          >
            {providersByTier.map((p) => {
              const list = modelsByProvider.get(p.id) ?? [];
              const suggested = list.filter((m) => m.isSuggested);
              const others = list.filter((m) => !m.isSuggested);
              const expanded = effectiveExpandedProviders.has(p.id);
              const providerRetainsData = Boolean(p.dataRetention);

              return (
                <div
                  key={p.id}
                  className={
                    "border rounded-md p-2 flex min-h-0 flex-col shrink-0 max-h-full min-w-[230px] max-w-[280px] grow"
                  }
                >
                  <div className="px-1 pb-2 mb-2 border-b">
                    <div className="text-xs tracking-wide text-muted-foreground flex items-center gap-2">
                      <ProviderIcon providerId={p.id} />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </div>
                  <div
                    className={
                      "flex min-h-0 flex-col max-h-full overflow-y-auto pr-1"
                    }
                  >
                    {!list.length ? (
                      <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                        No models match the filters
                      </div>
                    ) : (
                      <>
                        {suggested.map((m) => {
                          const restricted =
                            !session?.user &&
                            (Boolean(m.isPremium) || Boolean(m.isIncluded));
                          const titleText = restricted
                            ? "Sign in to use this model"
                            : undefined;
                          const onSelect = restricted
                            ? () => {
                                try {
                                  window.dispatchEvent(
                                    new Event("vz:open-login")
                                  );
                                } catch {
                                  /*ignore*/
                                }
                              }
                            : handleModelSelect;
                          return (
                            <ModelDropdownItem
                              key={m.id}
                              model={m}
                              currentModelId={currentModelId}
                              onSelect={onSelect}
                              providerId={p.id}
                              muted={restricted}
                              titleText={titleText}
                              showRetentionWarning={
                                providerRetainsData || Boolean(m.isFree)
                              }
                            />
                          );
                        })}

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
                            {others.map((m) => {
                              const restricted =
                                !session?.user &&
                                (Boolean(m.isPremium) || Boolean(m.isIncluded));
                              const titleText = restricted
                                ? "Sign in to use this model"
                                : undefined;
                              const onSelect = restricted
                                ? () => {
                                    try {
                                      window.dispatchEvent(
                                        new Event("vz:open-login")
                                      );
                                    } catch {
                                      /*ignore*/
                                    }
                                  }
                                : handleModelSelect;
                              return (
                                <ModelDropdownItem
                                  key={m.id}
                                  model={m}
                                  currentModelId={currentModelId}
                                  onSelect={onSelect}
                                  providerId={p.id}
                                  muted={restricted}
                                  titleText={titleText}
                                  showRetentionWarning={
                                    providerRetainsData || Boolean(m.isFree)
                                  }
                                />
                              );
                            })}
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
  );

  if (isSheet) {
    return (
      <div className="flex h-full flex-col overflow-hidden p-3">{body}</div>
    );
  }

  return (
    <DropdownMenuContent
      align="start"
      sideOffset={8}
      className={cn(
        "z-50 bg-popover text-popover-foreground shadow-md max-w-[100vw] max-h-[100vh] p-3",
        "sm:w-[min(1200px,calc(100vw-2rem))] sm:h-[min(80vh,700px)] sm:rounded-md sm:border"
      )}
    >
      {body}
    </DropdownMenuContent>
  );
};
