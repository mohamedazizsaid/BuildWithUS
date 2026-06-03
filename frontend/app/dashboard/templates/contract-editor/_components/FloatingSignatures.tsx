'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { FloatingSignature } from '../_lib/types';

type DragMode =
  | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'resize'; id: string; startX: number; startY: number; origW: number; origH: number; ratio: number; keepAspect: boolean };

export function FloatingSignatures({
  signatures,
  selectedId,
  onSelect,
  onUpdate,
  onRemove,
  pageRef,
}: {
  readonly signatures: FloatingSignature[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onUpdate: (id: string, patch: Partial<FloatingSignature>) => void;
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

  useEffect(() => { dragRef.current = drag; }, [drag]);

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
        const newW = Math.max(10, d.origW + dx);
        let newH = Math.max(8, d.origH + dy);
        if (d.keepAspect) newH = newW / d.ratio;
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

  const startMove = (e: React.MouseEvent, sig: FloatingSignature) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(sig.id);
    setDrag({ kind: 'move', id: sig.id, startX: e.clientX, startY: e.clientY, origX: sig.x, origY: sig.y });
  };

  const startResize = (e: React.MouseEvent, sig: FloatingSignature, keepAspect: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(sig.id);
    const ratio = sig.height > 0 ? sig.width / sig.height : 1;
    setDrag({
      kind: 'resize',
      id: sig.id,
      startX: e.clientX,
      startY: e.clientY,
      origW: sig.width,
      origH: sig.height,
      ratio,
      keepAspect,
    });
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}>
      {signatures.map((sig) => {
        const isSelected = selectedId === sig.id;
        return (
          <div
            key={sig.id}
            onMouseDown={(e) => startMove(e, sig)}
            onClick={(e) => { e.stopPropagation(); onSelect(sig.id); }}
            style={{
              position: 'absolute',
              left: `${sig.x}mm`,
              top: `${sig.y}mm`,
              width: `${sig.width}mm`,
              height: `${sig.height}mm`,
              cursor: drag?.kind === 'move' && drag.id === sig.id ? 'grabbing' : 'grab',
              pointerEvents: 'auto',
              outline: isSelected ? '2px solid #3b82f6' : 'none',
              outlineOffset: '-2px',
              userSelect: 'none',
            }}
          >
            {sig.kind === 'signed' && sig.src && (
              <img
                src={sig.src}
                alt="Signature"
                draggable={false}
                style={{
                  width: '100%', height: '100%',
                  display: 'block',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            )}

            {sig.kind === 'field' && (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                pointerEvents: 'none',
              }}>
                <div style={{
                  flex: 1,
                  background: isSelected ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                  borderTopWidth: '1px',
                  borderRightWidth: '1px',
                  borderLeftWidth: '1px',
                  borderBottomWidth: '1px',
                  borderTopStyle: 'dashed',
                  borderRightStyle: 'dashed',
                  borderLeftStyle: 'dashed',
                  borderBottomStyle: 'solid',
                  borderTopColor: isSelected ? 'transparent' : '#cbd5e1',
                  borderRightColor: isSelected ? 'transparent' : '#cbd5e1',
                  borderLeftColor: isSelected ? 'transparent' : '#cbd5e1',
                  borderBottomColor: '#1e293b',
                  borderRadius: '2px 2px 0 0',
                }} />
                <div style={{
                  fontSize: '8pt',
                  color: '#475569',
                  textAlign: 'center',
                  marginTop: '2px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  Signature — {sig.role || 'Client'}
                </div>
              </div>
            )}

            {isSelected && (
              <>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onRemove(sig.id); }}
                  title="Supprimer la signature"
                  style={{
                    position: 'absolute',
                    top: -12, right: -12,
                    width: 24, height: 24,
                    borderRadius: 12,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,.12)',
                    color: '#ef4444',
                  }}
                >
                  <Trash2 size={12} />
                </button>

                <div
                  onMouseDown={(e) => startResize(e, sig, false)}
                  title="Redimensionner librement"
                  style={{
                    position: 'absolute',
                    right: -6, bottom: -6,
                    width: 12, height: 12,
                    background: '#3b82f6',
                    border: '2px solid white',
                    borderRadius: 2,
                    cursor: 'nwse-resize',
                    boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                  }}
                />
                <div
                  onMouseDown={(e) => startResize(e, sig, true)}
                  title="Redimensionner en conservant les proportions (Shift)"
                  style={{
                    position: 'absolute',
                    right: -6, top: '50%',
                    transform: 'translateY(-50%)',
                    width: 10, height: 10,
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
