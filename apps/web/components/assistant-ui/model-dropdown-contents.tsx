"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { ProviderIcon } from "@/components/ui/providers/provider";
import { cn } from "@/components/ui/utils";
import type { ProviderTier } from "@/db";
import { useModelFavorites } from "@/hooks/use-model-favorites";
import { useModelsValue } from "@/hooks/use-models";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUser } from "@/lib/auth-client";
import { modelMap } from "@/lib/model-map";
import type { GetModelsListReturn } from "@/lib/trpc/models";
import { Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const t = useTranslations("ModelDropdown");
  const setUIState = useUIStateSetter();
  const includeModels = useMemo(
    () => (currentModelId ? [currentModelId] : []),
    [currentModelId]
  );
  const {
    models,
    providers,
    groups: suggestionGroups,
  } = useModelsValue({
    includeModels,
  });
  const user = useUser();
  const { favorites, hasFavorites, toggleFavorite } = useModelFavorites();
  const providersById = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider])),
    [providers]
  );

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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const showFavoritesToggle = Boolean(user) && hasFavorites;

  useEffect(() => {
    if (!showFavoritesToggle && showFavoritesOnly) {
      setShowFavoritesOnly(false);
    }
  }, [showFavoritesOnly, showFavoritesToggle]);

  const isSheet = variant === "sheet";

  // Ensure we always show something even if no providers in the default tier
  useEffect(() => {
    if (
      !providers.length ||
      selectedSuggestionGroup ||
      searchQuery.trim() ||
      showFavoritesOnly
    )
      return;
    const hasInSelected =
      selectedTier && providers.some((p) => p.tier === selectedTier);
    if (!hasInSelected) {
      const next = tierOptions.find(({ id }) =>
        providers.some((p) => p.tier === id)
      )?.id;
      if (next && next !== selectedTier) setSelectedTier(next);
    }
  }, [
    providers,
    selectedTier,
    selectedSuggestionGroup,
    searchQuery,
    showFavoritesOnly,
  ]);

  const toggleCapability = (cap: (typeof capabilityOptions)[number]["id"]) => {
    setSelectedCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
  };

  const toggleFavoritesOnly = useCallback(() => {
    setShowFavoritesOnly((prev) => {
      const next = !prev;
      if (next) {
        setSelectedSuggestionGroup(undefined);
      }
      return next;
    });
  }, [setSelectedSuggestionGroup]);

  const handleTierSelect = (
    tier: "leaders" | "challengers" | "specialists"
  ) => {
    if (showFavoritesOnly) {
      setShowFavoritesOnly(false);
    }
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
    if (showFavoritesOnly) {
      setShowFavoritesOnly(false);
    }
    setSelectedSuggestionGroup(groupId);
    setSearchQuery("");
  };

  const { groupedFavorites, missingFavoriteModelIds, favoritesSet } =
    useMemo(() => {
      const grouped = new Map<
        string,
        GetModelsListReturn["models"][number][]
      >();
      const missing: string[] = [];
      const favSet = new Set<string>();

      favorites.forEach((favorite) => {
        favSet.add(favorite.modelId);
        const model = modelMap.get(favorite.modelId);
        if (!model) {
          missing.push(favorite.modelId);
          return;
        }
        const list = grouped.get(model.providerId);
        if (list) {
          list.push(model);
        } else {
          grouped.set(model.providerId, [model]);
        }
      });

      return {
        groupedFavorites: grouped,
        missingFavoriteModelIds: missing,
        favoritesSet: favSet,
      };
    }, [favorites]);

  const favoriteFilteredModelsByProvider = useMemo(() => {
    if (!showFavoritesOnly) {
      return null;
    }

    const filtered = new Map<string, GetModelsListReturn["models"][number][]>();
    const hasSearchQuery = Boolean(searchQuery.trim());
    const normalizedQuery = hasSearchQuery
      ? normalize(searchQuery.trim().toLowerCase())
      : null;
    const hasCapabilityFilters = selectedCapabilities.size > 0;

    groupedFavorites.forEach((modelsForProvider, providerId) => {
      let list = [...modelsForProvider];

      if (hasSearchQuery && normalizedQuery) {
        const providerName =
          providersById.get(providerId)?.name.toLowerCase() ?? "";
        const normalizedProviderName = normalize(providerName);
        list = list.filter((model) => {
          if (normalizedProviderName.includes(normalizedQuery)) {
            return true;
          }
          return normalize(model.name.toLowerCase()).includes(normalizedQuery);
        });
      }

      if (hasCapabilityFilters) {
        list = list.filter((model) => {
          for (const cap of selectedCapabilities) {
            if (!model[cap]) return false;
          }
          return true;
        });
      }

      list.sort((a, b) => {
        const ap = a.priority ?? -Infinity;
        const bp = b.priority ?? -Infinity;
        if (ap !== bp) return bp - ap;
        return a.name.localeCompare(b.name);
      });

      if (list.length) {
        filtered.set(providerId, list);
      }
    });

    return filtered;
  }, [
    groupedFavorites,
    providersById,
    searchQuery,
    selectedCapabilities,
    showFavoritesOnly,
  ]);

  const providersByTier = useMemo(() => {
    if (showFavoritesOnly) {
      if (!favoriteFilteredModelsByProvider) {
        return [];
      }
      const favoriteProviderIds = new Set(
        Array.from(favoriteFilteredModelsByProvider.keys())
      );
      return providers.filter((provider) =>
        favoriteProviderIds.has(provider.id)
      );
    }

    if (searchQuery.trim()) {
      const query = normalize(searchQuery.trim().toLowerCase());
      return providers.filter((p) => {
        if (normalize(p.name.toLowerCase()).includes(query)) return true;
        const providerModels = models.filter((m) => m.providerId === p.id);
        return providerModels.some((m) =>
          normalize(m.name.toLowerCase()).includes(query)
        );
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
    favoriteFilteredModelsByProvider,
    showFavoritesOnly,
  ]);

  const modelsByProvider = useMemo(() => {
    const byProvider = new Map<string, typeof models>();
    const hasCapabilityFilters = selectedCapabilities.size > 0;
    const hasSearchQuery = searchQuery.trim();

    for (const p of providersByTier) {
      if (showFavoritesOnly) {
        const favoriteList = favoriteFilteredModelsByProvider?.get(p.id) ?? [];
        byProvider.set(p.id, favoriteList);
        continue;
      }

      let list = models.filter((m) => m.providerId === p.id);

      if (selectedSuggestionGroup) {
        list = list.filter((m) =>
          suggestionGroups
            .find((g) => g.id === selectedSuggestionGroup)
            ?.models.includes(m.id)
        );
      }

      if (hasSearchQuery) {
        const query = normalize(searchQuery.toLowerCase().trim());
        list = list.filter(
          (m) =>
            normalize(m.provider.name.toLowerCase()).includes(query) ||
            normalize(m.name.toLowerCase()).includes(query)
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

      // Separate favorites from non-favorites
      const favorites = filtered.filter((m) => favoritesSet.has(m.id));
      const nonFavorites = filtered.filter((m) => !favoritesSet.has(m.id));

      // Sort favorites by priority and name
      favorites.sort((a, b) => {
        const ap = a.priority ?? -Infinity;
        const bp = b.priority ?? -Infinity;
        if (ap !== bp) return bp - ap;
        return a.name.localeCompare(b.name);
      });

      // Sort non-favorites by priority and name
      nonFavorites.sort((a, b) => {
        const ap = a.priority ?? -Infinity;
        const bp = b.priority ?? -Infinity;
        if (ap !== bp) return bp - ap;
        return a.name.localeCompare(b.name);
      });

      // Combine favorites first, then non-favorites
      const sortedList = [...favorites, ...nonFavorites];

      byProvider.set(p.id, sortedList);
    }

    return byProvider;
  }, [
    models,
    providersByTier,
    searchQuery,
    selectedCapabilities,
    selectedSuggestionGroup,
    suggestionGroups,
    favoriteFilteredModelsByProvider,
    showFavoritesOnly,
    favoritesSet,
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
    showFavoritesOnly || selectedSuggestionGroup || searchQuery.trim()
      ? null
      : selectedTier;
  const effectiveSelectedSuggestionGroup =
    showFavoritesOnly || searchQuery.trim() ? null : selectedSuggestionGroup;

  const renderFavoritesFilterButton = () => {
    if (!showFavoritesToggle) {
      return null;
    }
    return (
      <Button
        type="button"
        variant={showFavoritesOnly ? "default" : "ghost"}
        size="sm"
        className={cn(
          "h-8 w-8 p-0",
          showFavoritesOnly
            ? "bg-background text-yellow-500 shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={showFavoritesOnly}
        title={t("favoritesFilter")}
        aria-label={t("favoritesFilter")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleFavoritesOnly();
        }}
      >
        <Star
          className={cn(
            "h-4 w-4",
            showFavoritesOnly ? "fill-current" : "fill-transparent"
          )}
        />
      </Button>
    );
  };

  const sheetFilters = (
    <div className="mb-3 flex w-full flex-col gap-1 px-1">
      <div className="flex w-full flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-md border bg-muted p-0.5">
          {renderFavoritesFilterButton()}
          {tierOptions.map(({ id, labelKey, Icon, color }) => {
            const active = effectiveSelectedTier === id;
            const label = t(labelKey);
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
        {capabilityOptions.map(({ id, labelKey, Icon, color }) => {
          const active = selectedCapabilities.has(id);
          const label = t(labelKey);
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
          {renderFavoritesFilterButton()}
          {tierOptions.map(({ id, labelKey, Icon, color }) => {
            const active = effectiveSelectedTier === id;
            const label = t(labelKey);
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
        {capabilityOptions.map(({ id, labelKey, Icon, color }) => {
          const active = selectedCapabilities.has(id);
          const label = t(labelKey);
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

  const handleFavoriteToggle = useCallback(
    (modelId: string) => {
      if (!user) {
        setUIState({ loginOpen: true });
        return;
      }
      toggleFavorite(modelId);
    },
    [toggleFavorite, user, setUIState]
  );

  const body = (
    <div className="flex h-full flex-col">
      {isSheet ? sheetFilters : desktopFilters}

      <div className="flex-1 overflow-hidden">
        {providersByTier.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
            {showFavoritesOnly ? t("favoritesEmpty") : t("noProviders")}
          </div>
        ) : (
          <div
            className={
              "flex min-w-full gap-4 overflow-x-auto pb-2 h-full items-start"
            }
          >
            {showFavoritesOnly && missingFavoriteModelIds.length > 0 && (
              <div
                className={
                  "border rounded-md p-2 flex min-h-0 flex-col shrink-0 max-h-full min-w-[230px] max-w-[280px]"
                }
              >
                <div className="px-1 pb-2 mb-2 border-b">
                  <div className="text-xs tracking-wide text-muted-foreground flex items-center gap-2">
                    <span className="font-medium">
                      {t("favoritesMissingHeader")}
                    </span>
                  </div>
                </div>
                {missingFavoriteModelIds.map((missingId) => (
                  <div
                    key={missingId}
                    className="flex items-center justify-between rounded-md border border-dashed border-border px-2 py-1.5 text-sm text-muted-foreground"
                  >
                    <span className="truncate">{missingId}</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleFavoriteToggle(missingId);
                      }}
                      aria-label={t("favoriteRemove")}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {providersByTier.map((p) => {
              const list = modelsByProvider.get(p.id) ?? [];
              const favorites = list.filter((m) => favoritesSet.has(m.id));
              const nonFavorites = list.filter((m) => !favoritesSet.has(m.id));
              const suggested = nonFavorites.filter((m) => m.isSuggested);
              const others = nonFavorites.filter((m) => !m.isSuggested);
              const expanded = effectiveExpandedProviders.has(p.id);
              const providerRetainsData = !!p.dataRetention;

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
                        {t("noModels")}
                      </div>
                    ) : (
                      <>
                        {/* Always show favorites first */}
                        {favorites.map((m) => {
                          const restricted =
                            !user &&
                            (Boolean(m.isPremium) || Boolean(m.isIncluded));
                          const titleText = restricted
                            ? t("signInToUse")
                            : undefined;
                          const onSelect = restricted
                            ? () => setUIState({ loginOpen: true })
                            : handleModelSelect;
                          return (
                            <ModelDropdownItem
                              key={m.id}
                              model={m}
                              selected={m.id === currentModelId}
                              onSelect={onSelect}
                              providerId={p.id}
                              muted={restricted}
                              titleText={titleText}
                              showRetentionWarning={
                                providerRetainsData || !!m.isFree
                              }
                              isFavorite={true}
                            />
                          );
                        })}

                        {suggested.map((m) => {
                          const restricted =
                            !user &&
                            (Boolean(m.isPremium) || Boolean(m.isIncluded));
                          const titleText = restricted
                            ? t("signInToUse")
                            : undefined;
                          const onSelect = restricted
                            ? () => setUIState({ loginOpen: true })
                            : handleModelSelect;
                          return (
                            <ModelDropdownItem
                              key={m.id}
                              model={m}
                              selected={m.id === currentModelId}
                              onSelect={onSelect}
                              providerId={p.id}
                              muted={restricted}
                              titleText={titleText}
                              showRetentionWarning={
                                providerRetainsData || !!m.isFree
                              }
                            />
                          );
                        })}

                        {others.length > 0 && !expanded && (
                          <button
                            className="mt-1 text-xs text-muted-foreground hover:text-foreground text-left px-2 py-1 cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleProviderExpanded(p.id);
                            }}
                          >
                            {t("showMore")}
                          </button>
                        )}

                        {others.length > 0 && expanded && (
                          <div className="mt-2">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 mb-1">
                              {t("otherModels")}
                            </div>
                            {others.map((m) => {
                              const restricted =
                                !user &&
                                (Boolean(m.isPremium) || Boolean(m.isIncluded));
                              const titleText = restricted
                                ? t("signInToUse")
                                : undefined;
                              const onSelect = restricted
                                ? () => setUIState({ loginOpen: true })
                                : handleModelSelect;
                              return (
                                <ModelDropdownItem
                                  key={m.id}
                                  model={m}
                                  selected={m.id === currentModelId}
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

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
