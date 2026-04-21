'use client';

import { useState, useRef } from 'react';
import { BlockData, GlobalStyles } from '@/lib/editor-types';

export function ResizableImage({ block, onUpdate, globalStyles }: { block: BlockData; onUpdate: (updates: Partial<BlockData>) => void; globalStyles: GlobalStyles }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'right' | 'bottom' | 'corner' | null>(null);
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const imgBorderSize = block.styles.borderSize || '0px';
  const imgBorderStyle = block.styles.borderStyle || 'solid';
  const imgBorderColor = block.styles.borderColor || 'transparent';
  const imgHasBorder = imgBorderSize !== '0px' && imgBorderSize !== '0';
  const isCircle = block.styles.borderRadius === '50%';

  const onMouseDown = (e: React.MouseEvent, handle: 'right' | 'bottom' | 'corner') => {
    e.preventDefault();
    e.stopPropagation();
    const img = containerRef.current?.querySelector('img');
    if (!img) return;
    startPos.current = { x: e.clientX, y: e.clientY, w: img.offsetWidth, h: img.offsetHeight };
    setDragging(handle);

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startPos.current.x;
      const dy = ev.clientY - startPos.current.y;
      const parent = containerRef.current?.parentElement;
      const maxW = parent ? parent.offsetWidth : 600;

      if (handle === 'right' || handle === 'corner') {
        const newW = Math.max(30, Math.min(maxW, startPos.current.w + dx));
        const pct = Math.round((newW / maxW) * 100);
        onUpdate({ styles: { ...block.styles, width: `${pct}%` } });
      }
      if (handle === 'bottom' || handle === 'corner') {
        const newH = Math.max(30, startPos.current.h + dy);
        onUpdate({ styles: { ...block.styles, height: `${newH}px` } });
      }
    };

    const onMouseUp = () => {
      setDragging(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div ref={containerRef} style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'], position: 'relative', display: 'inline-block', width: '100%' }} onClick={(e) => e.stopPropagation()}>
      <div style={{ position: 'relative', display: 'inline-block', width: block.styles.width, maxWidth: '100%' }}>
        <img
          src={block.content.src as string}
          alt={block.content.alt as string}
          style={{
            width: '100%',
            height: block.styles.height || 'auto',
            objectFit: block.styles.height ? 'cover' as const : undefined,
            borderRadius: block.styles.borderRadius || '0px',
            border: imgHasBorder ? `${imgBorderSize} ${imgBorderStyle} ${imgBorderColor}` : 'none',
            display: 'block',
            ...(isCircle ? { aspectRatio: '1/1', objectFit: 'cover' as const } : {}),
          }}
          draggable={false}
        />
        {/* Right handle */}
        <div
          onMouseDown={(e) => onMouseDown(e, 'right')}
          className={`absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-10 rounded-full cursor-ew-resize transition-colors ${dragging === 'right' ? 'bg-blue-500' : 'bg-blue-400/70 hover:bg-blue-500'}`}
        />
        {/* Bottom handle */}
        <div
          onMouseDown={(e) => onMouseDown(e, 'bottom')}
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-full cursor-ns-resize transition-colors ${dragging === 'bottom' ? 'bg-blue-500' : 'bg-blue-400/70 hover:bg-blue-500'}`}
        />
        {/* Corner handle */}
        <div
          onMouseDown={(e) => onMouseDown(e, 'corner')}
          className={`absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full cursor-nwse-resize border-2 border-white transition-colors ${dragging === 'corner' ? 'bg-blue-500' : 'bg-blue-400/70 hover:bg-blue-500'}`}
        />
        {/* Size indicator */}
        {dragging && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]">
            {block.styles.width}{block.styles.height ? ` × ${block.styles.height}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
