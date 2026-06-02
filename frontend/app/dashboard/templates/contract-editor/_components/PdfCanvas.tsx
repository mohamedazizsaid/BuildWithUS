'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Trash2, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import type { PdfTemplate, PdfPlacement } from '../_lib/pdf-template';
import { isTextPlacement, isShapePlacement, EDITOR_PAGE_WIDTH, PDF_LINE_HEIGHT } from '../_lib/pdf-template';

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

  // Arrow-key nudging of the selected placement — lets you reach tight lines
  // that are hard to fine-tune with the mouse. Shift = coarse 10px step.
  // Ignored while typing so it never fights text/inspector inputs.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      const placement = template.placements.find((p) => p.id === selectedId);
      if (!placement) return;
      const meta = pages.find((m) => m.pageNumber === placement.page);
      if (!meta) return;
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0;
      updatePlacement(selectedId, {
        x: clamp01(placement.x + dx / meta.cssWidth),
        y: clamp01(placement.y + dy / meta.cssHeight),
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, template.placements, pages, updatePlacement]);

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
  // Alignment guides shown while a chip on this page is being dragged.
  const [guides, setGuides] = useState<SnapGuides | null>(null);

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
      data-pdf-page={meta.pageNumber}
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
            siblings: placements.filter((s) => s.id !== p.id),
            onSelect: () => onSelect(p.id),
            onUpdate: (patch: Partial<PdfPlacement>) => onUpdate(p.id, patch),
            onRemove: () => onRemove(p.id),
            onGuides: setGuides,
          };
          return isShapePlacement(p)
            ? <ShapeChip key={p.id} {...common} />
            : <PlacementChip key={p.id} {...common} />;
        })}
      </div>
      {/* Smart alignment guides — drawn above chips while dragging. */}
      {guides && (guides.v.length > 0 || guides.h.length > 0) && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {guides.v.map((x, i) => (
            <div key={`gv${i}`} className="absolute top-0 bottom-0" style={{ left: x, width: 1, backgroundColor: '#ec4899' }} />
          ))}
          {guides.h.map((y, i) => (
            <div key={`gh${i}`} className="absolute left-0 right-0" style={{ top: y, height: 1, backgroundColor: '#ec4899' }} />
          ))}
        </div>
      )}

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
  /** Other placements on the same page — snap targets for smart guides. */
  readonly siblings: PdfPlacement[];
  readonly onSelect: () => void;
  readonly onUpdate: (patch: Partial<PdfPlacement>) => void;
  readonly onRemove: () => void;
  /** Report active alignment guides while dragging (null clears them). */
  readonly onGuides: (g: SnapGuides | null) => void;
}

function PlacementChip({ placement, pageWidth, pageHeight, selected, siblings, onSelect, onUpdate, onRemove, onGuides }: PlacementChipProps) {
  const left = placement.x * pageWidth;
  const top  = placement.y * pageHeight;
  const width = placement.width * pageWidth;
  const isText = isTextPlacement(placement);
  const [editing, setEditing] = useState(false);

  const startDrag = (e: React.MouseEvent) => {
    if (editing) return;
    e.stopPropagation();
    onSelect();
    // Capture the cursor's offset within the chip so the chip "sticks" to the
    // same grab point as the cursor crosses page boundaries.
    const chipRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grabDX = e.clientX - chipRect.left;
    const grabDY = e.clientY - chipRect.top;
    const dragW = placement.width * pageWidth;
    const onMove = (mv: MouseEvent) => {
      const target = pickPageAt(mv.clientY);
      if (!target) return;
      const lpx = (mv.clientX - grabDX) - target.rect.left;
      const tpx = (mv.clientY - grabDY) - target.rect.top;
      // Smart guides only apply while the chip stays on its own page (snap
      // targets are this page's other placements + its centre lines).
      if (target.pageNumber === placement.page) {
        const snap = computeSnap(lpx, tpx, dragW, height, siblings, pageWidth, pageHeight);
        onGuides(snap.guides);
        onUpdate({ page: target.pageNumber, x: clamp01(snap.left / pageWidth), y: clamp01(snap.top / pageHeight) });
      } else {
        onGuides(null);
        onUpdate({
          page: target.pageNumber,
          x: clamp01(lpx / target.rect.width),
          y: clamp01(tpx / target.rect.height),
        });
      }
    };
    const onUp = () => {
      onGuides(null);
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
  // Mirror the exporter's box model exactly so the editor is WYSIWYG:
  //   • each line is fontSize × PDF_LINE_HEIGHT tall (same as pdf-export.ts),
  //   • text is top-anchored with no inner padding, so the browser's line box
  //     drops the first baseline at the same spot the exporter targets
  //     (PDF_FIRST_BASELINE),
  //   • the affordance is an outline (drawn outside the box) so text never
  //     shifts between states or vs. the exported PDF.
  const lineCount = isText ? Math.max(1, (placement.text ?? '').split('\n').length) : 1;
  const height = placement.fontSize * PDF_LINE_HEIGHT * lineCount;
  const align = placement.align ?? 'left';

  const fill = placement.whiteout ? (placement.whiteoutColor || '#ffffff') : undefined;
  const outline = selected
    ? '2px solid #6366f1'
    : isText
      ? '1px dashed #cbd5e1'
      : '1px solid #93c5fd';
  // Faint editor-only fill keeps empty chips visible over the PDF (not exported).
  const bg = fill ?? (selected ? undefined : isText ? 'rgba(255,255,255,0.7)' : 'rgba(239,246,255,0.92)');
  const textStyle: React.CSSProperties = {
    fontSize: placement.fontSize,
    lineHeight: PDF_LINE_HEIGHT,
    textAlign: align,
    color: isText ? '#1a1a1a' : '#1d4ed8',
    fontWeight: placement.bold ? 700 : isText ? 400 : 600,
    fontStyle: placement.italic ? 'italic' : 'normal',
    // Text previews in a Helvetica-like face to match the stamped font; the
    // variable token keeps a monospace affordance (its value, not the token,
    // is what gets stamped).
    fontFamily: isText ? 'Helvetica, Arial, sans-serif' : 'ui-monospace, SFMono-Regular, Menlo, monospace',
  };

  return (
    <div
      onMouseDown={startDrag}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onDoubleClick={(e) => { if (isText) { e.stopPropagation(); onSelect(); setEditing(true); } }}
      className={`absolute pointer-events-auto select-none ${editing ? 'cursor-text' : 'cursor-move'}`}
      style={{ left, top, width, height, outline, outlineOffset: 0, backgroundColor: bg }}
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
          className="w-full h-full bg-transparent outline-none resize-none overflow-hidden block"
          style={{ ...textStyle, padding: 0, border: 0, whiteSpace: 'pre-wrap' }}
        />
      ) : (
        <div
          className="w-full h-full overflow-hidden"
          style={{ ...textStyle, whiteSpace: isText ? 'pre-wrap' : 'nowrap', wordBreak: 'break-word' }}
        >
          {isText ? (placement.text || 'Texte vide') : `{{${label}}}`}
        </div>
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

/** Active smart-guide lines, in page px. `v` = vertical lines (x), `h` = horizontal (y). */
interface SnapGuides { v: number[]; h: number[]; }

/** Pixel height a placement occupies in the editor — mirrors the chip render so
 *  snap targets line up with what the user sees. */
function chipPixelHeight(p: PdfPlacement, pageHeight: number): number {
  if (isShapePlacement(p)) return (p.height ?? 0.05) * pageHeight;
  const lineCount = isTextPlacement(p) ? Math.max(1, (p.text ?? '').split('\n').length) : 1;
  return p.fontSize * PDF_LINE_HEIGHT * lineCount;
}

// Canva-style smart guides: snap the dragged box's left / centre / right and
// top / centre / bottom edges to any sibling's matching edge or the page centre,
// within a small pixel threshold. Returns the (possibly snapped) top-left in
// page px plus the guide lines to draw.
function computeSnap(
  dragLeft: number,
  dragTop: number,
  dragW: number,
  dragH: number,
  siblings: PdfPlacement[],
  pageW: number,
  pageH: number,
): { left: number; top: number; guides: SnapGuides } {
  const THRESHOLD = 6;
  const vTargets: number[] = [pageW / 2];
  const hTargets: number[] = [pageH / 2];
  for (const s of siblings) {
    const sL = s.x * pageW;
    const sT = s.y * pageH;
    const sW = s.width * pageW;
    const sH = chipPixelHeight(s, pageH);
    vTargets.push(sL, sL + sW / 2, sL + sW);
    hTargets.push(sT, sT + sH / 2, sT + sH);
  }

  const guides: SnapGuides = { v: [], h: [] };
  let left = dragLeft;
  let top = dragTop;

  // Offsets of each candidate edge from the box's top-left corner.
  let bestV: { delta: number; pos: number; offset: number } | null = null;
  for (const offset of [0, dragW / 2, dragW]) {
    const edge = dragLeft + offset;
    for (const t of vTargets) {
      const delta = Math.abs(edge - t);
      if (delta <= THRESHOLD && (!bestV || delta < bestV.delta)) bestV = { delta, pos: t, offset };
    }
  }
  if (bestV) { left = bestV.pos - bestV.offset; guides.v.push(bestV.pos); }

  let bestH: { delta: number; pos: number; offset: number } | null = null;
  for (const offset of [0, dragH / 2, dragH]) {
    const edge = dragTop + offset;
    for (const t of hTargets) {
      const delta = Math.abs(edge - t);
      if (delta <= THRESHOLD && (!bestH || delta < bestH.delta)) bestH = { delta, pos: t, offset };
    }
  }
  if (bestH) { top = bestH.pos - bestH.offset; guides.h.push(bestH.pos); }

  return { left, top, guides };
}

// Pick the page wrapper the cursor is currently over, or — when the cursor is
// in the gutter between pages or outside all pages — the page closest in Y.
// Why: chips drag in document-level mousemove handlers; without this, a chip's
// page stays whatever it was at mousedown and clamp01(y) traps it on that page.
function pickPageAt(clientY: number): { pageNumber: number; rect: DOMRect } | null {
  const els = document.querySelectorAll<HTMLElement>('[data-pdf-page]');
  if (els.length === 0) return null;
  let best: { pageNumber: number; rect: DOMRect; dist: number } | null = null;
  for (const el of els) {
    const rect = el.getBoundingClientRect();
    const pageNumber = Number(el.dataset.pdfPage);
    if (clientY >= rect.top && clientY <= rect.bottom) return { pageNumber, rect };
    const dist = clientY < rect.top ? rect.top - clientY : clientY - rect.bottom;
    if (!best || dist < best.dist) best = { pageNumber, rect, dist };
  }
  return best ? { pageNumber: best.pageNumber, rect: best.rect } : null;
}

function ShapeChip({ placement, pageWidth, pageHeight, selected, siblings, onSelect, onUpdate, onRemove, onGuides }: PlacementChipProps) {
  const left = placement.x * pageWidth;
  const top  = placement.y * pageHeight;
  const width  = placement.width * pageWidth;
  const height = (placement.height ?? 0.05) * pageHeight;
  const stroke = placement.strokeWidth ?? 0;
  const isLine = placement.shape === 'line';

  const startDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    const chipRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grabDX = e.clientX - chipRect.left;
    const grabDY = e.clientY - chipRect.top;
    const onMove = (mv: MouseEvent) => {
      const target = pickPageAt(mv.clientY);
      if (!target) return;
      const lpx = (mv.clientX - grabDX) - target.rect.left;
      const tpx = (mv.clientY - grabDY) - target.rect.top;
      if (target.pageNumber === placement.page) {
        const snap = computeSnap(lpx, tpx, width, height, siblings, pageWidth, pageHeight);
        onGuides(snap.guides);
        onUpdate({ page: target.pageNumber, x: clamp01(snap.left / pageWidth), y: clamp01(snap.top / pageHeight) });
      } else {
        onGuides(null);
        onUpdate({
          page: target.pageNumber,
          x: clamp01(lpx / target.rect.width),
          y: clamp01(tpx / target.rect.height),
        });
      }
    };
    const onUp = () => {
      onGuides(null);
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
