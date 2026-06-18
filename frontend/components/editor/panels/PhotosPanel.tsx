'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImageIcon, Trash2 } from 'lucide-react';

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

interface OrgImage {
  url: string;
  fileName: string;
  size: number;
  lastModified: string;
}

const PAGE_SIZE = 40;

export function PhotosPanel() {
  const [tab, setTab] = useState<'stock' | 'imported'>('stock');

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Photos</h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 p-0.5 rounded-lg bg-muted/50">
        <button
          onClick={() => setTab('stock')}
          className={`flex-1 h-7 rounded-md text-xs font-medium transition-all ${
            tab === 'stock' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Banque d&apos;images
        </button>
        <button
          onClick={() => setTab('imported')}
          className={`flex-1 h-7 rounded-md text-xs font-medium transition-all ${
            tab === 'imported' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Importées
        </button>
      </div>

      {tab === 'stock' ? <StockImages /> : <ImportedImages />}
    </div>
  );
}

// ─── Stock images (Pexels-style search via the image service) ───
function StockImages() {
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

// ─── Imported images (uploaded by the org — shared across all its users) ───
function ImportedImages() {
  const [images, setImages] = useState<OrgImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { media } = await import('@/lib/api');
      const data = await media.list();
      setImages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { media } = await import('@/lib/api');
      await media.upload(file);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    // Optimistic removal — restore on failure.
    const prev = images;
    setImages((imgs) => imgs.filter((i) => i.fileName !== fileName));
    try {
      const { media } = await import('@/lib/api');
      await media.delete(fileName);
    } catch {
      setImages(prev);
      setError('Échec de la suppression');
    }
  };

  const handleCopyUrl = async (img: OrgImage) => {
    await navigator.clipboard.writeText(img.url);
    setCopied(img.fileName);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full h-9 mb-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-accent hover:border-ring transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {uploading ? (
          <><div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Upload en cours...</>
        ) : (
          <><ImageIcon size={14} /> Importer une image</>
        )}
      </button>

      <p className="text-[10px] text-muted-foreground mb-2">Images de votre organisation — partagées entre tous les membres.</p>

      {error && <p className="text-xs text-red-500 mb-2">⚠ {error}</p>}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Aucune image importée. Cliquez « Importer une image ».</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {images.map((img) => (
            <div
              key={img.fileName}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('stockImageUrl', img.url);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="relative group rounded-lg overflow-hidden border border-border cursor-grab active:cursor-grabbing hover:border-ring transition-all aspect-4/3"
              onClick={() => handleCopyUrl(img)}
              title={img.fileName.split('/').pop()}
            >
              <img
                src={img.url}
                alt="importée"
                className="w-full h-full object-cover pointer-events-none"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex flex-col items-center justify-center gap-1">
                {copied === img.fileName ? (
                  <span className="text-white text-[10px] font-medium bg-green-600 px-2 py-0.5 rounded">Copié ✓</span>
                ) : (
                  <span className="text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Glisser ou cliquer</span>
                )}
              </div>
              <button
                onClick={(e) => handleDelete(e, img.fileName)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                title="Supprimer"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
