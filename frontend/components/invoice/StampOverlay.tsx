'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCw, Trash2 } from 'lucide-react';
import type { InvoiceStamp } from '@/lib/invoice/types';
import type { Dispatch } from './blocks';

/**
 * Placed stamp on the invoice canvas — absolutely positioned in mm.
 *
 * Interactions:
 *  - Drag the image body to move (in mm, computed from the canvas's
 *    rendered width-to-mm ratio).
 *  - Drag the bottom-right handle to resize (width in mm; height
 *    follows the image's aspect ratio).
 *  - Drag the top-right handle to rotate (around the image center).
 *  - Buttons in the toolbar to reset rotation / delete.
 *
 * We use pointer events instead of HTML5 drag so the user gets a smooth,
 * cursor-locked drag without ghost previews — and so this doesn't fight with
 * the outline panel's HTML5 drag-and-drop.
 */
export function StampOverlay({
  stamp, canvasRef, dispatch, selected, onSelect,
}: {
  stamp: InvoiceStamp;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  dispatch: Dispatch;
  selected: boolean;
  onSelect: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<'idle' | 'move' | 'resize' | 'rotate'>('idle');

  // mm-per-px conversion derived from the canvas's actual rendered width.
  // The canvas is sized in mm via CSS, so the same ratio applies to both axes.
  const pxToMm = useCallback(
    (px: number): number => {
      const w = canvasRef.current?.getBoundingClientRect().width ?? 794;
      return (px * 210) / w;
    },
    [canvasRef],
  );

  // ── Pointer event handlers (move / resize / rotate) ────────────────────
  useEffect(() => {
    if (mode === 'idle') return;

    const start = startRef.current;
    if (!start) return;

    const handleMove = (e: PointerEvent) => {
      const dxMm = pxToMm(e.clientX - start.clientX);
      const dyMm = pxToMm(e.clientY - start.clientY);
      if (mode === 'move') {
        dispatch({ type: 'stamp/place', x: clamp(start.x + dxMm, 0, 210 - 5), y: Math.max(0, start.y + dyMm) });
      } else if (mode === 'resize') {
        const next = clamp(start.width + dxMm, 12, 120);
        dispatch({ type: 'stamp/update', patch: { width: next } });
      } else if (mode === 'rotate') {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        // Center of the stamp (px) — start.x/y are mm of the top-left corner.
        const centerXpx = canvasRect.left + mmToPx(start.x + start.width / 2, canvasRect.width);
        const centerYpx = canvasRect.top  + mmToPx(start.y + (start.width * start.aspectRatio) / 2, canvasRect.width);
        const angle = (Math.atan2(e.clientY - centerYpx, e.clientX - centerXpx) * 180) / Math.PI;
        // The handle sits at top-right (~ -45° offset), so subtract that to
        // make rotation feel anchored to the user's cursor direction.
        dispatch({ type: 'stamp/update', patch: { rotation: roundTo(angle + 135, 1) } });
      }
    };

    const handleUp = () => setMode('idle');

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [mode, dispatch, pxToMm, canvasRef]);

  // Snapshot at drag-start so deltas are computed against a stable anchor.
  const startRef = useRef<{
    clientX: number; clientY: number;
    x: number; y: number; width: number; rotation: number;
    aspectRatio: number; // height / width of the loaded image (1 until known)
  } | null>(null);

  const [aspectRatio, setAspectRatio] = useState(1);

  const beginDrag = (kind: 'move' | 'resize' | 'rotate') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    startRef.current = {
      clientX: e.clientX, clientY: e.clientY,
      x: stamp.x, y: stamp.y, width: stamp.width, rotation: stamp.rotation,
      aspectRatio,
    };
    setMode(kind);
  };

  return (
    <div
      ref={rootRef}
      onPointerDown={beginDrag('move')}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{
        position: 'absolute',
        left: `${stamp.x}mm`,
        top: `${stamp.y}mm`,
        width: `${stamp.width}mm`,
        transform: `rotate(${stamp.rotation}deg)`,
        transformOrigin: 'center center',
        cursor: mode === 'move' ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
      className={`group ${selected ? 'outline-2 outline-dashed outline-indigo-400 outline-offset-2' : 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-slate-300 hover:outline-offset-2'}`}
    >
      <img
        src={stamp.url}
        alt="Tampon"
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth > 0) setAspectRatio(img.naturalHeight / img.naturalWidth);
        }}
        style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
      />

      {selected && (
        <>
          {/* Resize handle (bottom-right) */}
          <div
            onPointerDown={beginDrag('resize')}
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border-2 border-indigo-500 shadow"
            style={{ cursor: 'nwse-resize', transform: `rotate(${-stamp.rotation}deg)` }}
            title="Redimensionner"
          />
          {/* Rotate handle (top-right) */}
          <div
            onPointerDown={beginDrag('rotate')}
            className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow flex items-center justify-center"
            style={{ cursor: 'grab', transform: `rotate(${-stamp.rotation}deg)` }}
            title="Pivoter"
          >
            <RotateCw size={6} className="text-white" />
          </div>
          {/* Toolbar (top-left) */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-7 left-0 flex items-center gap-0.5 bg-white rounded-md shadow border border-slate-200 px-1 py-0.5"
            style={{ transform: `rotate(${-stamp.rotation}deg)`, transformOrigin: 'top left' }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); dispatch({ type: 'stamp/update', patch: { rotation: 0 } }); }}
              className="px-1 py-0.5 text-[9px] text-slate-500 hover:text-slate-900"
              title="Aligner"
            >
              0°
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); dispatch({ type: 'stamp/remove' }); }}
              className="p-0.5 text-red-500 hover:bg-red-50 rounded"
              title="Supprimer le tampon"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function roundTo(n: number, decimals: number): number {
  const m = 10 ** decimals;
  return Math.round(n * m) / m;
}

function mmToPx(mm: number, canvasWidthPx: number): number {
  return (mm * canvasWidthPx) / 210;
}
