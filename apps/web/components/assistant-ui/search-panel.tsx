"use client";

import { AlertCircleIcon, ChevronDownIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useCurrentChat } from "@/hooks/use-chat";
import { useChatActions } from "@/hooks/use-chat-actions";
import { useProjectsValue } from "@/hooks/use-projects";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { CHAT_LIST_PAGE_SIZE } from "@/lib/constants";
import { trpc, type RouterOutputs } from "@/lib/trpc/client";
import { SearchResultItem } from "./search-result-item";

type SearchResult = RouterOutputs["chats"]["searchChats"]["results"][number];

const MIN_QUERY_LENGTH = 2;

const toDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

export const SearchPanel = () => {
  const t = useTranslations("SearchPanel");
  const setUIState = useUIStateSetter();
  const [, setCurrentChat] = useCurrentChat();
  const { loadChatById } = useChatActions();
  const projects = useProjectsValue();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  const inputRef = useRef<HTMLInputElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery((prev) => {
        const trimmed = searchTerm.trim();
        return prev === trimmed ? prev : trimmed;
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const queryEnabled = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const searchVariables = useMemo(
    () => ({
      query: debouncedQuery,
      limit: CHAT_LIST_PAGE_SIZE,
      projectId: selectedProjectId ?? undefined,
    }),
    [debouncedQuery, selectedProjectId]
  );

  const searchQuery = trpc.chats.searchChats.useInfiniteQuery(searchVariables, {
    enabled: queryEnabled,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    refetchOnWindowFocus: false,
    staleTime: 5_000,
  });

  const searchResults = useMemo(
    () =>
      queryEnabled
        ? (searchQuery.data?.pages.flatMap((page) => page.results) ?? [])
        : [],
    [queryEnabled, searchQuery.data]
  );

  const selectedProject = useMemo(
    () =>
      selectedProjectId
        ? (projects.find((project) => project.id === selectedProjectId) ?? null)
        : null,
    [projects, selectedProjectId]
  );

  const isInitialLoading = queryEnabled && searchQuery.isLoading;
  const isLoadingMore =
    queryEnabled && searchQuery.isFetchingNextPage && searchResults.length > 0;
  const showNoResults =
    queryEnabled &&
    !isInitialLoading &&
    !searchQuery.isFetching &&
    searchResults.length === 0;

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = searchQuery;

  useEffect(() => {
    if (!queryEnabled) return;

    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: "200px" }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [queryEnabled, fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleClose = useCallback(() => {
    setUIState({ panelOpen: null });
  }, [setUIState]);

  const handleClear = useCallback(() => {
    setSearchTerm("");
    setDebouncedQuery("");
    setLoadError(null);
  }, []);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key === "Enter") {
        const trimmed = searchTerm.trim();
        if (trimmed) {
          setDebouncedQuery(trimmed);
        }
      }
    },
    [handleClose, searchTerm]
  );

  const handleSelectChat = useCallback(
    async (result: SearchResult) => {
      if (loadingChatId) return;

      setLoadError(null);
      setLoadingChatId(result.chatId);
      try {
        setCurrentChat({
          id: result.chatId,
          createdAt: new Date(),
          addedToList: true,
          projectId: result.projectId,
          title: result.title,
          fetchedTitlePanelId: "loaded-from-db",
        });

        const loadResult = await loadChatById(result.chatId);
        if (!loadResult?.success) {
          setLoadError(t("loadError"));
          return;
        }

        setUIState({ panelOpen: null, suggestionsUsed: true });
      } catch (error) {
        console.error("Failed to load chat from search:", error);
        setLoadError(t("loadError"));
      } finally {
        setLoadingChatId(null);
      }
    },
    [loadChatById, loadingChatId, setCurrentChat, setUIState, t]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          {searchTerm && (
            <Button variant="ghost" onClick={handleClear}>
              {t("clear")}
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            {t("close")}
          </Button>
        </div>
      </header>

      <div className="relative">
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
        />
      </div>

      {projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t("filter.label")}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {selectedProject ? (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: selectedProject.color }}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="text-xs font-medium">
                  {selectedProject
                    ? selectedProject.name
                    : t("filter.allProjects")}
                </span>
                <ChevronDownIcon className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => setSelectedProjectId(null)}>
                {t("filter.allProjects")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className="flex items-center gap-2"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: project.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{project.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedProject && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProjectId(null)}
            >
              {t("filter.clear")}
            </Button>
          )}
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="min-h-0 flex-1">
        <div className="flex h-full flex-col overflow-hidden bg-background">
          <div className="flex-1 overflow-y-auto">
            {!searchTerm.trim() && <EmptyState message={t("startTyping")} />}

            {searchTerm.trim() &&
              !queryEnabled &&
              searchTerm.trim().length > 0 && (
                <EmptyState
                  message={t("minQuery", { count: MIN_QUERY_LENGTH })}
                />
              )}

            {queryEnabled && searchQuery.error && (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <AlertCircleIcon className="h-5 w-5 text-destructive" />
                <div className="text-sm text-muted-foreground">
                  {t("error")}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => searchQuery.refetch()}
                >
                  {t("retry")}
                </Button>
              </div>
            )}

            {isInitialLoading && (
              <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-muted-foreground">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                <span>{t("loading")}</span>
              </div>
            )}

            {showNoResults && <EmptyState message={t("empty")} />}

            {queryEnabled &&
              !isInitialLoading &&
              searchResults.map((result) => (
                <SearchResultItem
                  key={`${result.chatId}-${(
                    result.snippetCreatedAt ?? result.lastMessageAt
                  ).getTime()}`}
                  title={result.title}
                  snippet={result.snippet}
                  timestamp={toDate(
                    result.snippetCreatedAt ?? result.lastMessageAt
                  )}
                  query={debouncedQuery}
                  projectName={result.projectName}
                  projectColor={result.projectColor}
                  isLoading={loadingChatId === result.chatId}
                  onSelect={() => handleSelectChat(result)}
                />
              ))}
            {queryEnabled && (
              <div ref={sentinelRef} className="h-3" aria-hidden="true" />
            )}
            {isLoadingMore && (
              <div className="flex items-center justify-center gap-2 px-6 py-4 text-xs text-muted-foreground">
                <Loader2Icon className="h-3 w-3 animate-spin" />
                <span>{t("loadingMore")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  message: string;
}

const EmptyState = ({ message }: EmptyStateProps) => (
  <div className="flex items-center justify-center px-6 py-10 text-sm text-muted-foreground">
    {message}
  </div>
);
