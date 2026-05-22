'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import type { PdfTemplate, PdfPlacement } from '../_lib/pdf-template';

interface PdfCanvasProps {
  readonly template: PdfTemplate;
  readonly onChange: (next: PdfTemplate) => void;
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
}

// Target CSS-pixel width of each rendered page. We multiply by devicePixelRatio
// at rasterization time so the bitmap stays crisp on hi-DPR screens.
const PAGE_TARGET_WIDTH = 760;

// Minimal subset of the pdfjs-dist types we need — typed this way to avoid
// importing pdfjs at module scope (it's a browser-only ESM module and would
// blow up Next.js SSR if imported eagerly).
interface PdfDocLike {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
  destroy?: () => Promise<void>;
}
interface PdfPageLike {
  getViewport(args: { scale: number }): { width: number; height: number };
  render(args: { canvas: HTMLCanvasElement; canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
}

interface PageMeta {
  pageNumber: number;
  cssWidth: number;
  cssHeight: number;
}

export function PdfCanvas({ template, onChange, selectedId, onSelect }: PdfCanvasProps) {
  const [pdf, setPdf] = useState<PdfDocLike | null>(null);
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load the PDF document and collect page metadata. The actual rasterization
  // is delegated to each <PdfPage>, which owns its own canvas ref.
  useEffect(() => {
    let cancelled = false;
    let loadedDoc: PdfDocLike | null = null;

    setLoading(true);
    setLoadError(null);
    setPages([]);
    setPdf(null);

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const doc = (await pdfjs.getDocument(template.pdfUrl).promise) as unknown as PdfDocLike;
        if (cancelled) { await doc.destroy?.(); return; }
        loadedDoc = doc;

        const metas: PageMeta[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelled) return;
          const page = await doc.getPage(n);
          const baseViewport = page.getViewport({ scale: 1 });
          const cssScale = PAGE_TARGET_WIDTH / baseViewport.width;
          metas.push({
            pageNumber: n,
            cssWidth:  PAGE_TARGET_WIDTH,
            cssHeight: baseViewport.height * cssScale,
          });
        }
        if (cancelled) return;
        setPdf(doc);
        setPages(metas);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('[PdfCanvas] PDF load failed', err);
          setLoadError(err instanceof Error ? err.message : 'Erreur de chargement du PDF');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      loadedDoc?.destroy?.().catch(() => {});
    };
  }, [template.pdfUrl]);

  const updatePlacement = useCallback((id: string, patch: Partial<PdfPlacement>) => {
    onChange({
      ...template,
      placements: template.placements.map((p) => p.id === id ? { ...p, ...patch } : p),
    });
  }, [template, onChange]);

  const removePlacement = useCallback((id: string) => {
    onChange({ ...template, placements: template.placements.filter((p) => p.id !== id) });
    if (selectedId === id) onSelect(null);
  }, [template, onChange, selectedId, onSelect]);

  const handlePageDrop = useCallback((e: React.DragEvent<HTMLDivElement>, pageNumber: number) => {
    const name = e.dataTransfer.getData('variable-name');
    if (!name) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    const label = e.dataTransfer.getData('variable-label') || undefined;
    const id = `p${pageNumber}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    onChange({
      ...template,
      placements: [
        ...template.placements,
        { id, page: pageNumber, x, y, width: 0.25, fontSize: 11, variableName: name, label, align: 'left' },
      ],
    });
    onSelect(id);
  }, [template, onChange, onSelect]);

  return (
    <div className="flex flex-col items-center gap-6 py-6 px-4 min-h-full">
      {loading && (
        <div className="text-sm text-slate-400">Chargement du PDF…</div>
      )}
      {loadError && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 px-4 py-2 rounded-md">
          Erreur de chargement&nbsp;: {loadError}
        </div>
      )}
      {pdf && pages.map((meta) => (
        <PdfPage
          key={`${template.pdfUrl}-${meta.pageNumber}`}
          pdf={pdf}
          meta={meta}
          placements={template.placements.filter((p) => p.page === meta.pageNumber)}
          selectedId={selectedId}
          onSelect={onSelect}
          onUpdate={updatePlacement}
          onRemove={removePlacement}
          onDrop={(e) => handlePageDrop(e, meta.pageNumber)}
        />
      ))}
    </div>
  );
}

interface PdfPageProps {
  readonly pdf: PdfDocLike;
  readonly meta: PageMeta;
  readonly placements: PdfPlacement[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onUpdate: (id: string, patch: Partial<PdfPlacement>) => void;
  readonly onRemove: (id: string) => void;
  readonly onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

function PdfPage({ pdf, meta, placements, selectedId, onSelect, onUpdate, onRemove, onDrop }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Rasterize this page once we have a canvas ref. The dependency on
  // pdf + pageNumber means a PDF swap forces a fresh paint without
  // having to mutate state.
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width  = `${meta.cssWidth}px`;
    canvas.style.height = `${meta.cssHeight}px`;
    canvas.width  = Math.round(meta.cssWidth  * dpr);
    canvas.height = Math.round(meta.cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    (async () => {
      try {
        const page = await pdf.getPage(meta.pageNumber);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const renderViewport = page.getViewport({ scale: (meta.cssWidth / baseViewport.width) * dpr });
        await page.render({ canvas, canvasContext: ctx, viewport: renderViewport }).promise;
      } catch (err) {
        if (!cancelled) {
          console.error(`[PdfCanvas] render page ${meta.pageNumber} failed`, err);
          setRenderError('Échec du rendu');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [pdf, meta.pageNumber, meta.cssWidth, meta.cssHeight]);

  return (
    <div
      className="relative shadow-md bg-white rounded-sm"
      style={{ width: meta.cssWidth, height: meta.cssHeight }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('variable-name')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={onDrop}
      onClick={(e) => { if (e.target === e.currentTarget) onSelect(null); }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" aria-hidden />
      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-red-500 bg-red-50/70">
          {renderError}
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none">
        {placements.map((p) => (
          <PlacementChip
            key={p.id}
            placement={p}
            pageWidth={meta.cssWidth}
            pageHeight={meta.cssHeight}
            selected={selectedId === p.id}
            onSelect={() => onSelect(p.id)}
            onUpdate={(patch) => onUpdate(p.id, patch)}
            onRemove={() => onRemove(p.id)}
          />
        ))}
      </div>
      <div className="absolute top-1.5 left-2 text-[10px] text-slate-400 font-mono select-none pointer-events-none">
        p.{meta.pageNumber}
      </div>
    </div>
  );
}

interface PlacementChipProps {
  readonly placement: PdfPlacement;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onUpdate: (patch: Partial<PdfPlacement>) => void;
  readonly onRemove: () => void;
}

function PlacementChip({ placement, pageWidth, pageHeight, selected, onSelect, onUpdate, onRemove }: PlacementChipProps) {
  const left = placement.x * pageWidth;
  const top  = placement.y * pageHeight;
  const width = placement.width * pageWidth;

  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const startDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      origX: placement.x, origY: placement.y,
    };
    const onMove = (mv: MouseEvent) => {
      const s = dragState.current;
      if (!s) return;
      const dx = (mv.clientX - s.startX) / pageWidth;
      const dy = (mv.clientY - s.startY) / pageHeight;
      onUpdate({
        x: clamp01(s.origX + dx),
        y: clamp01(s.origY + dy),
      });
    };
    const onUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const origWidth = placement.width;
    const startX = e.clientX;
    const onMove = (mv: MouseEvent) => {
      const dx = (mv.clientX - startX) / pageWidth;
      onUpdate({ width: Math.max(0.04, Math.min(1 - placement.x, origWidth + dx)) });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const label = placement.label ?? placement.variableName;

  return (
    <div
      onMouseDown={startDrag}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`absolute pointer-events-auto cursor-move select-none rounded-md flex items-center px-2 ${
        selected
          ? 'bg-indigo-100 border-2 border-indigo-500 shadow-md'
          : 'bg-blue-50/95 border border-blue-300 hover:border-blue-500'
      }`}
      style={{
        left, top, width,
        height: Math.max(18, placement.fontSize * 1.5),
        fontSize: placement.fontSize,
        color: '#1d4ed8', fontWeight: 600,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        justifyContent: placement.align === 'center' ? 'center' : placement.align === 'right' ? 'flex-end' : 'flex-start',
      }}
      title={`{{${placement.variableName}}}`}
    >
      <span className="truncate text-[0.85em]">{`{{${label}}}`}</span>
      {selected && (
        <>
          <button
            type="button"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600"
            title="Supprimer"
          >
            <Trash2 size={10} />
          </button>
          <div
            onMouseDown={startResize}
            className="absolute -right-1 top-0 bottom-0 w-2 cursor-ew-resize"
            title="Redimensionner"
          />
        </>
      )}
    </div>
  );
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function PdfPlacementInspector({ placement, onChange }: {
  readonly placement: PdfPlacement;
  readonly onChange: (patch: Partial<PdfPlacement>) => void;
}) {
  return (
    <div className="space-y-3 text-xs">
      <div>
        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Variable</label>
        <div className="font-mono text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded">
          {`{{${placement.variableName}}}`}
        </div>
      </div>
      <div>
        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Taille (pt)</label>
        <input
          type="number" min={6} max={48} step={1}
          value={placement.fontSize}
          onChange={(e) => onChange({ fontSize: Math.max(6, Math.min(48, Number(e.target.value) || 11)) })}
          className="w-full h-8 rounded border border-slate-200 px-2 text-xs"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Alignement</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ align: a })}
              className={`flex-1 h-8 rounded border text-xs capitalize ${placement.align === a ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const PDF_TARGET_WIDTH = PAGE_TARGET_WIDTH;
