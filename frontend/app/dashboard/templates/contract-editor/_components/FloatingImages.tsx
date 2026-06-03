'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { FloatingImage } from '../_lib/types';

type DragMode =
  | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'resize'; id: string; startX: number; startY: number; origW: number; origH: number; ratio: number; keepAspect: boolean };

export function FloatingImages({
  images,
  selectedId,
  onSelect,
  onUpdate,
  onRemove,
  pageRef,
}: {
  readonly images: FloatingImage[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onUpdate: (id: string, patch: Partial<FloatingImage>) => void;
  readonly onRemove: (id: string) => void;
  readonly pageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [drag, setDrag] = useState<DragMode | null>(null);
  const dragRef = useRef<DragMode | null>(null);

  const pxPerMm = useCallback(() => {
    const el = pageRef.current;
    if (!el) return 3.78;
    return el.getBoundingClientRect().width / 210;
  }, [pageRef]);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const k = pxPerMm();
      const dx = (e.clientX - d.startX) / k;
      const dy = (e.clientY - d.startY) / k;
      if (d.kind === 'move') {
        onUpdate(d.id, { x: d.origX + dx, y: d.origY + dy });
      } else {
        const newW = Math.max(8, d.origW + dx);
        let newH = Math.max(8, d.origH + dy);
        if (d.keepAspect) {
          newH = newW / d.ratio;
        }
        onUpdate(d.id, { width: newW, height: newH });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, onUpdate, pxPerMm]);

  const startMove = (e: React.MouseEvent, img: FloatingImage) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(img.id);
    setDrag({ kind: 'move', id: img.id, startX: e.clientX, startY: e.clientY, origX: img.x, origY: img.y });
  };

  const startResize = (e: React.MouseEvent, img: FloatingImage, keepAspect: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(img.id);
    const ratio = img.height > 0 ? img.width / img.height : 1;
    setDrag({
      kind: 'resize',
      id: img.id,
      startX: e.clientX,
      startY: e.clientY,
      origW: img.width,
      origH: img.height,
      ratio,
      keepAspect,
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 30,
      }}
    >
      {images.map((img) => {
        const isSelected = selectedId === img.id;
        return (
          <div
            key={img.id}
            onMouseDown={(e) => startMove(e, img)}
            onClick={(e) => { e.stopPropagation(); onSelect(img.id); }}
            style={{
              position: 'absolute',
              left: `${img.x}mm`,
              top: `${img.y}mm`,
              width: `${img.width}mm`,
              height: `${img.height}mm`,
              cursor: drag?.kind === 'move' && drag.id === img.id ? 'grabbing' : 'grab',
              pointerEvents: 'auto',
              outline: isSelected ? '2px solid #3b82f6' : 'none',
              outlineOffset: '-2px',
              userSelect: 'none',
            }}
          >
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />

            {isSelected && (
              <>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                  title="Supprimer l'image"
                  style={{
                    position: 'absolute',
                    top: -12,
                    right: -12,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,.12)',
                    color: '#ef4444',
                  }}
                >
                  <Trash2 size={12} />
                </button>

                <div
                  onMouseDown={(e) => startResize(e, img, false)}
                  title="Redimensionner librement"
                  style={{
                    position: 'absolute',
                    right: -6,
                    bottom: -6,
                    width: 12,
                    height: 12,
                    background: '#3b82f6',
                    border: '2px solid white',
                    borderRadius: 2,
                    cursor: 'nwse-resize',
                    boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                  }}
                />
                <div
                  onMouseDown={(e) => startResize(e, img, true)}
                  title="Redimensionner en conservant les proportions (Shift)"
                  style={{
                    position: 'absolute',
                    right: -6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 10,
                    height: 10,
                    background: 'white',
                    border: '2px solid #3b82f6',
                    borderRadius: '50%',
                    cursor: 'ew-resize',
                    boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
