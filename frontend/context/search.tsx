'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
  clearQuery: () => void;
}

const SearchContext = createContext<SearchContextValue>({
  query: '',
  setQuery: () => {},
  clearQuery: () => {},
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQueryState] = useState('');
  const pathname = usePathname();
  const lastPathRef = useRef(pathname);

  // Auto-clear when navigating to a new route
  if (pathname !== lastPathRef.current) {
    lastPathRef.current = pathname;
    if (query !== '') setQueryState('');
  }

  const setQuery = useCallback((q: string) => setQueryState(q), []);
  const clearQuery = useCallback(() => setQueryState(''), []);

  return (
    <SearchContext.Provider value={{ query, setQuery, clearQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
