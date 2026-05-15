'use client';

import { useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { BlockData, GlobalStyles } from '@/lib/editor-types';

export function ResizableButton({ block, onUpdate, globalStyles, btnEditRef, onSelect, placeCaretEndRef, pendingTextRef }: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
  globalStyles: GlobalStyles;
  btnEditRef: React.RefObject<HTMLSpanElement | null>;
  onSelect: (e: React.MouseEvent) => void;
  placeCaretEndRef: React.RefObject<boolean>;
  pendingTextRef: React.RefObject<string | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const startPos = useRef({ x: 0, w: 0 });

  const btnWidth = block.styles.btnWidth || 'auto';

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = containerRef.current?.querySelector('.btn-shape') as HTMLElement;
    if (!btn) return;
    startPos.current = { x: e.clientX, w: btn.offsetWidth };
    setDragging(true);

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startPos.current.x;
      const parent = containerRef.current?.parentElement;
      const maxW = parent ? parent.offsetWidth : 600;
      const newW = Math.max(60, Math.min(maxW, startPos.current.w + dx));
      const pct = Math.round((newW / maxW) * 100);
      onUpdate({ styles: { ...block.styles, btnWidth: `${pct}%` } });
    };

    const onMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div ref={containerRef} style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }} onClick={(e) => e.stopPropagation()}>
      <div style={{ position: 'relative', display: 'inline-block', width: btnWidth !== 'auto' ? btnWidth : undefined }}>
        <span
          className="btn-shape"
          style={{
            display: 'block',
            width: '100%',
            backgroundColor: block.styles.backgroundColor || globalStyles.btnBackgroundColor,
            color: block.styles.color || globalStyles.btnFontColor,
            fontSize: block.styles.fontSize || globalStyles.btnFontSize,
            fontWeight: block.styles.fontWeight || globalStyles.btnFontWeight,
            fontFamily: block.styles.fontFamily || globalStyles.btnFontFamily,
            padding: block.styles.padding,
            borderRadius: block.styles.borderRadius || globalStyles.btnBorderRadius,
            border: `${block.styles.borderSize || globalStyles.btnBorderSize} solid ${block.styles.borderColor || globalStyles.btnBorderColor}`,
            lineHeight: block.styles.lineHeight || 'inherit',
            letterSpacing: block.styles.letterSpacing || 'inherit',
            textAlign: 'center',
          }}
        >
          <span
            ref={btnEditRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={(e) => { pendingTextRef.current = e.currentTarget.innerHTML || ''; }}
            onBlur={(e) => {
              pendingTextRef.current = null;
              // flushSync so the click handler that just stole focus (e.g. Save) sees the latest text.
              flushSync(() => {
                onUpdate({ content: { text: e.currentTarget.innerHTML || '' } });
              });
            }}
            style={{ outline: 'none', minWidth: '20px', display: 'inline-block' }}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '\u00a0\u00a0\u00a0\u00a0');
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              placeCaretEndRef.current = false;
              onSelect(e as unknown as React.MouseEvent);
            }}
          />
        </span>
        {/* Right resize handle */}
        <div
          onMouseDown={onMouseDown}
          className={`absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-8 rounded-full cursor-ew-resize transition-colors ${dragging ? 'bg-blue-500' : 'bg-blue-400/70 hover:bg-blue-500'}`}
        />
        {/* Left resize handle */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const btn = containerRef.current?.querySelector('.btn-shape') as HTMLElement;
            if (!btn) return;
            startPos.current = { x: e.clientX, w: btn.offsetWidth };
            setDragging(true);

            const onMouseMove = (ev: MouseEvent) => {
              const dx = startPos.current.x - ev.clientX;
              const parent = containerRef.current?.parentElement;
              const maxW = parent ? parent.offsetWidth : 600;
              const newW = Math.max(60, Math.min(maxW, startPos.current.w + dx));
              const pct = Math.round((newW / maxW) * 100);
              onUpdate({ styles: { ...block.styles, btnWidth: `${pct}%` } });
            };

            const onMouseUp = () => {
              setDragging(false);
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
          className={`absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-8 rounded-full cursor-ew-resize transition-colors ${dragging ? 'bg-blue-500' : 'bg-blue-400/70 hover:bg-blue-500'}`}
        />
        {dragging && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]">
            {btnWidth}
          </div>
        )}
      </div>
    </div>
  );
}
