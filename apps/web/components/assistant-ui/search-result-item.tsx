"use client";

import { Loader2Icon } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/components/ui/utils";

interface SearchResultItemProps {
  title: string;
  snippet: string | null;
  timestamp: Date | null;
  query: string;
  isLoading?: boolean;
  onSelect: () => void;
}

export const SearchResultItem = ({
  title,
  snippet,
  timestamp,
  query,
  isLoading = false,
  onSelect,
}: SearchResultItemProps) => {
  const highlightedSnippet = useMemo(
    () => (snippet ? highlightText(snippet, query) : null),
    [query, snippet]
  );
  const highlightedTitle = useMemo(
    () => highlightText(title, query),
    [query, title]
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isLoading}
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 cursor-pointer",
        isLoading && "opacity-70",
        !snippet && "py-3"
      )}
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium truncate flex-1">
          {highlightedTitle}
        </p>
        {timestamp && (
          <span className="text-xs text-muted-foreground shrink-0">
            {timestamp.toLocaleDateString()}
          </span>
        )}
        {isLoading && (
          <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {highlightedSnippet && (
        <p className="text-xs text-muted-foreground leading-snug line-clamp-3">
          {highlightedSnippet}
        </p>
      )}
    </button>
  );
};

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const segments: React.ReactNode[] = [];

  let searchIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, searchIndex);

  while (matchIndex !== -1) {
    if (matchIndex > searchIndex) {
      segments.push(
        <span key={`text-${searchIndex}-${matchIndex}`}>
          {text.slice(searchIndex, matchIndex)}
        </span>
      );
    }

    const matchEnd = matchIndex + lowerQuery.length;
    segments.push(
      <mark
        key={`highlight-${matchIndex}-${matchEnd}`}
        className="rounded bg-primary/20 dark:bg-primary/80 px-0.5"
      >
        {text.slice(matchIndex, matchEnd)}
      </mark>
    );

    searchIndex = matchEnd;
    matchIndex = lowerText.indexOf(lowerQuery, searchIndex);
  }

  if (searchIndex < text.length) {
    segments.push(
      <span key={`text-${searchIndex}-end`}>{text.slice(searchIndex)}</span>
    );
  }

  return segments;
}
