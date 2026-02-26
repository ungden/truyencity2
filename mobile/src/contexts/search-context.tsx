import React, { createContext, useContext } from "react";
import { useSearch } from "@/hooks/use-search";

type SearchContextValue = ReturnType<typeof useSearch> & {
  isSearchActive: boolean;
  setSearchActive: (active: boolean) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const search = useSearch();
  const [isSearchActive, setSearchActive] = React.useState(false);

  return (
    <SearchContext.Provider
      value={{ ...search, isSearchActive, setSearchActive }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearchContext must be used within <SearchProvider>");
  }
  return ctx;
}
