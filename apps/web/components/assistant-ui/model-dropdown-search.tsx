"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/utils";
import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

interface ModelDropdownSearchProps {
  onSearchChange: (query: string) => void;
  onSearchFocusChange: (isFocused: boolean) => void;
  searchQuery: string;
  isSearchFocused: boolean;
}

export const ModelDropdownSearch: React.FC<ModelDropdownSearchProps> = ({
  onSearchChange,
  onSearchFocusChange,
  searchQuery,
  isSearchFocused,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handling for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isSearchFocused) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchFocused]);

  return (
    <div className="relative ml-auto">
      <div className="relative">
        {!isSearchFocused && !searchQuery && (
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={
            isSearchFocused ? "Search models..." : "Type / to search"
          }
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => onSearchFocusChange(true)}
          onBlur={() => onSearchFocusChange(false)}
          className={cn(
            "h-8 w-64 pl-10 pr-3 text-sm",
            (isSearchFocused || searchQuery) && "pl-3", // Remove left padding when focused to hide magnifier
            "transition-all duration-200"
          )}
        />
      </div>
    </div>
  );
};
