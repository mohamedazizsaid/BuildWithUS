"use client";

import * as React from "react";
import { Search, Sun, Moon, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useSearch } from "@/context/search";

const PAGE_SEARCH_CONFIG: Record<string, { placeholder: string }> = {
  "/dashboard/templates": { placeholder: "Rechercher des modèles..." },
  "/dashboard/team":      { placeholder: "Rechercher des membres..." },
  "/dashboard/favourites":{ placeholder: "Rechercher dans les favoris..." },
};

function getSearchConfig(pathname: string) {
  for (const [prefix, config] of Object.entries(PAGE_SEARCH_CONFIG)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return config;
  }
  return null;
}

export default function Navbar() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const pathname = usePathname();
  const { query, setQuery, clearQuery } = useSearch();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme =
      storedTheme === "dark" || (!storedTheme && prefersDark) ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("theme", next);
      return next;
    });
  };

  const searchConfig = getSearchConfig(pathname ?? "");

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />

      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={searchConfig ? query : ""}
            onChange={(e) => searchConfig && setQuery(e.target.value)}
            placeholder={searchConfig?.placeholder ?? "Rechercher..."}
            disabled={!searchConfig}
            className="w-full pl-9 pr-8 py-1.5 bg-muted/50 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-40 disabled:cursor-default"
          />
          {searchConfig && query && (
            <button
              onClick={() => { clearQuery(); inputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={toggleTheme}
        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Toggle theme"
        title={theme === "dark" ? "Mode clair" : "Mode sombre"}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}
