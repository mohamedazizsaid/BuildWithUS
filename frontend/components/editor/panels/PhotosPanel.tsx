'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Photos Panel ───
const IMAGE_SEARCH_API = process.env.NEXT_PUBLIC_IMAGE_SEARCH_API ?? 'http://localhost:8002';

interface StockImage {
  id: string;
  url: string;
  tags: string[];
  description: string | null;
  width: number | null;
  height: number | null;
  score: number;
}

const PAGE_SIZE = 40;

export function PhotosPanel() {
  // ── Stock state
  const [query, setQuery] = useState('');
  const [stockImages, setStockImages] = useState<StockImage[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchImages = useCallback(async (q: string) => {
    setIsSearching(true);
    setSearchError(null);
    setDisplayCount(PAGE_SIZE);
    try {
      const endpoint = q.trim()
        ? `${IMAGE_SEARCH_API}/search?q=${encodeURIComponent(q)}&limit=200`
        : `${IMAGE_SEARCH_API}/popular?limit=200`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data: StockImage[] = await res.json();
      setStockImages(data);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Erreur de connexion');
      // Keep previous results visible on error
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Load popular images on mount
  useEffect(() => {
    fetchImages('');
  }, [fetchImages]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchImages(val), 500);
  };

  const handleCopyUrl = async (img: StockImage) => {
    await navigator.clipboard.writeText(img.url);
    setCopiedId(img.id);
    setTimeout(() => setCopiedId(null), 1500);
    // Increment usage count in background
    fetch(`${IMAGE_SEARCH_API}/use/${img.id}`, { method: 'POST' }).catch(() => {});
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Photos</h3>

      <input
        type="text"
        value={query}
        onChange={handleSearchChange}
        placeholder="Rechercher... plage, bureau, nature"
        className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring mb-3"
      />
      {!query.trim() && (
        <p className="text-[10px] text-muted-foreground mb-2">Images populaires</p>
      )}
      {searchError && (
        <p className="text-xs text-red-500 mb-2">⚠ {searchError} — vérifiez que le serveur images est lancé (port 8002).</p>
      )}
      {isSearching && stockImages.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stockImages.length === 0 && !isSearching ? (
        <p className="text-xs text-muted-foreground text-center py-6">Aucune image trouvée.</p>
      ) : (
        <>
          <div className={`grid grid-cols-2 gap-1.5 transition-opacity ${isSearching ? 'opacity-50' : 'opacity-100'}`}>
            {stockImages.slice(0, displayCount).map((img) => (
              <div
                key={img.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('stockImageUrl', img.url);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="relative group rounded-lg overflow-hidden border border-border cursor-grab active:cursor-grabbing hover:border-ring transition-all aspect-4/3"
                onClick={() => handleCopyUrl(img)}
                title={img.description ?? img.tags.join(', ')}
              >
                <img
                  src={img.url}
                  alt={img.tags[0] ?? 'stock'}
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex flex-col items-center justify-center gap-1">
                  {copiedId === img.id ? (
                    <span className="text-white text-[10px] font-medium bg-green-600 px-2 py-0.5 rounded">Copié ✓</span>
                  ) : (
                    <span className="text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Glisser ou cliquer</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {displayCount < stockImages.length && (
            <button
              onClick={() => setDisplayCount(c => c + PAGE_SIZE)}
              className="w-full mt-2 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-accent transition-all"
            >
              Voir plus ({stockImages.length - displayCount} restantes)
            </button>
          )}
        </>
      )}
    </div>
  );
}
