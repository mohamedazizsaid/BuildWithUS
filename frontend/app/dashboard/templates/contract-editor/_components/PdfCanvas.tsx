'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Trash2, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import type { PdfTemplate, PdfPlacement } from '../_lib/pdf-template';
import { isTextPlacement, isShapePlacement, EDITOR_PAGE_WIDTH } from '../_lib/pdf-template';

interface PdfCanvasProps {
  readonly template: PdfTemplate;
  readonly onChange: (next: PdfTemplate) => void;
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
}

// Target CSS-pixel width of each rendered page. We multiply by devicePixelRatio
// at rasterization time so the bitmap stays crisp on hi-DPR screens. Shared with
// the exporter so stamped font sizes scale to match the editor.
const PAGE_TARGET_WIDTH = EDITOR_PAGE_WIDTH;

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
      // Chips stop click propagation, so any click reaching here is empty space → deselect.
      onClick={() => onSelect(null)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" aria-hidden />
      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-red-500 bg-red-50/70">
          {renderError}
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none">
        {placements.map((p) => {
          const common = {
            placement: p,
            pageWidth: meta.cssWidth,
            pageHeight: meta.cssHeight,
            selected: selectedId === p.id,
            onSelect: () => onSelect(p.id),
            onUpdate: (patch: Partial<PdfPlacement>) => onUpdate(p.id, patch),
            onRemove: () => onRemove(p.id),
          };
          return isShapePlacement(p)
            ? <ShapeChip key={p.id} {...common} />
            : <PlacementChip key={p.id} {...common} />;
        })}
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
  const isText = isTextPlacement(placement);
  const [editing, setEditing] = useState(false);

  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const startDrag = (e: React.MouseEvent) => {
    if (editing) return;
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
  // Text zones grow vertically with their line count so multi-line content is
  // fully visible; variables / empty text stay one line tall.
  const lineCount = isText ? Math.max(1, (placement.text ?? '').split('\n').length) : 1;
  const height = Math.max(18, placement.fontSize * 1.5 * lineCount);
  const justify = placement.align === 'center' ? 'center' : placement.align === 'right' ? 'flex-end' : 'flex-start';

  // Visual: a 'text' chip previews the actual stamped text in near-black over
  // its (optional) white-out fill, mirroring the export. A 'variable' chip
  // keeps the blue {{token}} affordance.
  const fill = placement.whiteout ? (placement.whiteoutColor || '#ffffff') : undefined;
  const borderClass = selected
    ? 'border-2 border-indigo-500 shadow-md'
    : isText
      ? 'border border-dashed border-slate-300 hover:border-slate-500'
      : 'border border-blue-300 hover:border-blue-500';

  return (
    <div
      onMouseDown={startDrag}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onDoubleClick={(e) => { if (isText) { e.stopPropagation(); onSelect(); setEditing(true); } }}
      className={`absolute pointer-events-auto select-none rounded-md flex px-2 ${isText ? 'items-start py-0.5' : 'items-center'} ${editing ? 'cursor-text' : 'cursor-move'} ${borderClass} ${!fill && !selected ? (isText ? 'bg-white/80' : 'bg-blue-50/95') : ''}`}
      style={{
        left, top, width, height,
        backgroundColor: selected && !fill ? undefined : fill,
        fontSize: placement.fontSize,
        color: isText ? '#1a1a1a' : '#1d4ed8',
        fontWeight: placement.bold ? 700 : isText ? 400 : 600,
        fontStyle: placement.italic ? 'italic' : 'normal',
        fontFamily: isText ? 'inherit' : 'ui-monospace, SFMono-Regular, Menlo, monospace',
        justifyContent: justify,
      }}
      title={isText ? placement.text : `{{${placement.variableName}}}`}
    >
      {editing ? (
        <textarea
          autoFocus
          rows={lineCount}
          value={placement.text ?? ''}
          onChange={(e) => onUpdate({ text: e.target.value })}
          onBlur={() => setEditing(false)}
          // Enter inserts a new line; Escape finishes editing.
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setEditing(false); } }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full h-full bg-transparent outline-none resize-none overflow-hidden whitespace-pre-wrap leading-[1.5]"
          style={{ fontSize: placement.fontSize, color: '#1a1a1a', textAlign: placement.align ?? 'left' }}
        />
      ) : (
        <span className="w-full whitespace-pre-wrap break-words leading-[1.5] text-[0.85em]">
          {isText ? (placement.text || 'Texte vide') : `{{${label}}}`}
        </span>
      )}
      {selected && !editing && (
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

function ShapeChip({ placement, pageWidth, pageHeight, selected, onSelect, onUpdate, onRemove }: PlacementChipProps) {
  const left = placement.x * pageWidth;
  const top  = placement.y * pageHeight;
  const width  = placement.width * pageWidth;
  const height = (placement.height ?? 0.05) * pageHeight;
  const stroke = placement.strokeWidth ?? 0;
  const isLine = placement.shape === 'line';

  const startDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    const startX = e.clientX, startY = e.clientY;
    const origX = placement.x, origY = placement.y;
    const onMove = (mv: MouseEvent) => {
      onUpdate({
        x: clamp01(origX + (mv.clientX - startX) / pageWidth),
        y: clamp01(origY + (mv.clientY - startY) / pageHeight),
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const origW = placement.width, origH = placement.height ?? 0.05;
    const onMove = (mv: MouseEvent) => {
      onUpdate({
        width:  Math.max(0.02, Math.min(1 - placement.x, origW + (mv.clientX - startX) / pageWidth)),
        height: Math.max(0.01, Math.min(1 - placement.y, origH + (mv.clientY - startY) / pageHeight)),
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      onMouseDown={startDrag}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className="absolute pointer-events-auto cursor-move"
      style={{
        left, top, width, height,
        outline: selected ? '2px solid #6366f1' : undefined,
        outlineOffset: 2,
      }}
      title={placement.shape}
    >
      {isLine ? (
        <div
          className="absolute left-0 right-0"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            height: Math.max(1, stroke),
            backgroundColor: placement.strokeColor || '#000000',
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: placement.noFill ? 'transparent' : (placement.fillColor || '#ffffff'),
            border: stroke > 0 ? `${stroke}px solid ${placement.strokeColor || '#000000'}` : undefined,
            borderRadius: placement.shape === 'ellipse' ? '50%' : undefined,
          }}
        />
      )}
      {selected && (
        <>
          <button
            type="button"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 z-10"
            title="Supprimer"
          >
            <Trash2 size={10} />
          </button>
          <div
            onMouseDown={startResize}
            className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-indigo-500 border border-white rounded-sm cursor-nwse-resize z-10"
            title="Redimensionner"
          />
        </>
      )}
    </div>
  );
}

export function PdfPlacementInspector({ placement, onChange, onReorder }: {
  readonly placement: PdfPlacement;
  readonly onChange: (patch: Partial<PdfPlacement>) => void;
  readonly onReorder?: (dir: 'front' | 'back' | 'forward' | 'backward') => void;
}) {
  const isText = isTextPlacement(placement);
  const isShape = isShapePlacement(placement);
  return (
    <div className="space-y-3 text-xs">
      {isShape ? (
        <ShapeInspector placement={placement} onChange={onChange} />
      ) : (
        <>
          {isText ? (
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Texte</label>
              <textarea
                rows={2}
                value={placement.text ?? ''}
                onChange={(e) => onChange({ text: e.target.value })}
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs resize-y"
                placeholder="Texte à afficher…"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Variable</label>
              <div className="font-mono text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded">
                {`{{${placement.variableName}}}`}
              </div>
            </div>
          )}
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
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Style</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChange({ bold: !placement.bold })}
                className={`flex-1 h-8 rounded border text-xs font-bold ${placement.bold ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => onChange({ italic: !placement.italic })}
                className={`flex-1 h-8 rounded border text-xs italic ${placement.italic ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
              >
                I
              </button>
            </div>
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
          <div className="pt-1 border-t border-slate-100">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Masquer le fond</span>
              <input
                type="checkbox"
                checked={!!placement.whiteout}
                onChange={(e) => onChange({ whiteout: e.target.checked })}
                className="h-3.5 w-3.5 accent-indigo-600"
              />
            </label>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
              Recouvre le contenu d&apos;origine du PDF derrière ce texte.
            </p>
            {placement.whiteout && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={placement.whiteoutColor || '#ffffff'}
                  onChange={(e) => onChange({ whiteoutColor: e.target.value })}
                  className="h-7 w-9 rounded border border-slate-200 p-0.5 cursor-pointer"
                  title="Couleur du masque"
                />
                <span className="font-mono text-[11px] text-slate-500">{placement.whiteoutColor || '#ffffff'}</span>
              </div>
            )}
          </div>
        </>
      )}

      {onReorder && (
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Calque</label>
          <div className="flex gap-1">
            <button type="button" onClick={() => onReorder('back')}
              className="flex-1 h-8 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-1" title="Arrière-plan">
              <ArrowDownToLine size={13} />
            </button>
            <button type="button" onClick={() => onReorder('backward')}
              className="flex-1 h-8 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[11px]" title="Reculer">
              −1
            </button>
            <button type="button" onClick={() => onReorder('forward')}
              className="flex-1 h-8 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[11px]" title="Avancer">
              +1
            </button>
            <button type="button" onClick={() => onReorder('front')}
              className="flex-1 h-8 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-1" title="Premier plan">
              <ArrowUpToLine size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShapeInspector({ placement, onChange }: {
  readonly placement: PdfPlacement;
  readonly onChange: (patch: Partial<PdfPlacement>) => void;
}) {
  const isLine = placement.shape === 'line';
  return (
    <>
      <div>
        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Forme</label>
        <div className="font-mono text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded capitalize">
          {placement.shape}
        </div>
      </div>
      {!isLine && (
        <div className="pt-1">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Remplissage</span>
            <input
              type="checkbox"
              checked={!placement.noFill}
              onChange={(e) => onChange({ noFill: !e.target.checked })}
              className="h-3.5 w-3.5 accent-indigo-600"
            />
          </label>
          {!placement.noFill && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={placement.fillColor || '#ffffff'}
                onChange={(e) => onChange({ fillColor: e.target.value })}
                className="h-7 w-9 rounded border border-slate-200 p-0.5 cursor-pointer"
                title="Couleur de remplissage"
              />
              <span className="font-mono text-[11px] text-slate-500">{placement.fillColor || '#ffffff'}</span>
            </div>
          )}
        </div>
      )}
      <div>
        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
          {isLine ? 'Épaisseur (px)' : 'Bordure (px)'}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={placement.strokeColor || '#000000'}
            onChange={(e) => onChange({ strokeColor: e.target.value })}
            className="h-8 w-9 rounded border border-slate-200 p-0.5 cursor-pointer"
            title="Couleur du trait"
          />
          <input
            type="number" min={0} max={40} step={1}
            value={placement.strokeWidth ?? 0}
            onChange={(e) => onChange({ strokeWidth: Math.max(0, Math.min(40, Number(e.target.value) || 0)) })}
            className="flex-1 h-8 rounded border border-slate-200 px-2 text-xs"
          />
        </div>
      </div>
    </>
  );
}

export const PDF_TARGET_WIDTH = PAGE_TARGET_WIDTH;
