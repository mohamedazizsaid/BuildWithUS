'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { BlockData, GlobalStyles } from '@/lib/editor-types';
import { resolvePadding, resolveMargin, resolveBlockAlign } from './utils';
import { ResizableImage } from './ResizableImage';
import { EditableTable } from './EditableTable';
import { ResizableButton } from './ResizableButton';
import { renderBlock } from './BlockRenderer';

export function CanvasBlock({
  block, isSelected, onSelect, onRemove, onDuplicate, onUpdate, globalStyles,
}: {
  block: BlockData;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdate: (updates: Partial<BlockData>) => void;
  globalStyles: GlobalStyles;
}) {
  const isTextBlock = block.type === 'heading' || block.type === 'text' || block.type === 'button';
  const isLayoutBlock = block.type === 'heading' || block.type === 'text';
  const editRef = useRef<HTMLDivElement>(null);
  const btnEditRef = useRef<HTMLSpanElement>(null);
  const placeCaretEndRef = useRef(false);
  const padding = resolvePadding(block.styles);
  const margin = resolveMargin(block.styles);
  const alignMargins = isLayoutBlock ? resolveBlockAlign(block.styles) : {};
  const hasBorder = isLayoutBlock && block.styles.borderSize && block.styles.borderSize !== '0px';

  // Typed-but-not-yet-committed text — onInput writes here, interval flushes to state.
  // This keeps React out of the hot path while typing (zero re-renders per keystroke).
  const pendingText = useRef<string | null>(null);

  // Set innerHTML only on initial selection (not on style changes)
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isSelected && isTextBlock) {
      const el = block.type === 'button' ? btnEditRef.current : editRef.current;
      if (el) {
        // Only set innerHTML when first entering edit mode
        if (!initializedRef.current) {
          el.innerHTML = (block.content.text as string) || '';
          initializedRef.current = true;
        }
        el.focus();
        if (placeCaretEndRef.current) {
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          placeCaretEndRef.current = false;
        }
      }
    } else {
      initializedRef.current = false;
      pendingText.current = null;
    }
  }, [isSelected, isTextBlock, block.type]);

  // Flush pending text to template state at most once every 100ms.
  // Decouples keystrokes from React renders → no caret jumps, no lag.
  useEffect(() => {
    if (!isSelected || !isTextBlock) return;
    const id = setInterval(() => {
      if (pendingText.current !== null) {
        onUpdate({ content: { text: pendingText.current } });
        pendingText.current = null;
      }
    }, 100);
    return () => clearInterval(id);
  // onUpdate identity changes each render but we intentionally keep the interval
  // alive across those renders — the ref always carries the latest text.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected, isTextBlock]);

  return (
    <div
      className={`relative transition-all group/block ${isTextBlock ? 'cursor-text' : 'cursor-pointer'} ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'
      }`}
      style={{
        padding,
        margin,
        height: 'auto',
        overflow: 'visible',
        width: isLayoutBlock ? block.styles.width || undefined : undefined,
        maxWidth: isLayoutBlock ? '100%' : undefined,
        backgroundColor: isLayoutBlock ? (block.styles.backgroundColor || 'transparent') : undefined,
        backgroundImage: isLayoutBlock && block.styles.backgroundImage ? `url(${block.styles.backgroundImage})` : undefined,
        backgroundSize: isLayoutBlock && block.styles.backgroundImage ? 'cover' : undefined,
        backgroundPosition: isLayoutBlock && block.styles.backgroundImage ? 'center' : undefined,
        backgroundRepeat: isLayoutBlock && block.styles.backgroundImage ? 'no-repeat' : undefined,
        borderRadius: isLayoutBlock ? block.styles.borderRadius : undefined,
        border: hasBorder ? `${block.styles.borderSize} ${block.styles.borderStyle || 'solid'} ${block.styles.borderColor || 'transparent'}` : undefined,
        ...alignMargins,
      }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const insideEditable = !!target.closest('[contenteditable="true"]');
        // selecting block by clicking outside editable text should put caret at end
        placeCaretEndRef.current = !insideEditable;
        onSelect(e);
      }}
    >
      {/* Block action buttons */}
      <div className={`absolute -top-2 -right-2 flex gap-1 z-20 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100'
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm hover:bg-blue-600"
          title="Dupliquer"
        >
          <Copy size={10} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm hover:bg-red-600"
          title="Supprimer"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Block content */}
      <div style={{ overflow: 'hidden', wordBreak: 'break-word' as const }}>
      {isSelected && block.type === 'table' ? (
        <EditableTable block={block} onUpdate={onUpdate} />
      ) : isSelected && block.type === 'image' && block.content.src ? (
        <ResizableImage block={block} onUpdate={onUpdate} globalStyles={globalStyles} />
      ) : isSelected && isTextBlock ? (
        <>
          {block.type === 'button' ? (
            <ResizableButton block={block} onUpdate={onUpdate} globalStyles={globalStyles} btnEditRef={btnEditRef} onSelect={onSelect} placeCaretEndRef={placeCaretEndRef} pendingText={pendingText} />
          ) : (
            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => { pendingText.current = e.currentTarget.innerHTML || ''; }}
              onBlur={(e) => {
                pendingText.current = null;
                onUpdate({ content: { text: e.currentTarget.innerHTML || '' } });
              }}
              style={{
                fontSize: block.styles.fontSize || 'inherit',
                fontWeight: block.styles.fontWeight || 'inherit',
                fontFamily: block.styles.fontFamily || 'inherit',
                fontStyle: block.styles.fontStyle || 'normal',
                textDecoration: block.styles.textDecoration || 'none',
                color: block.styles.color || 'inherit',
                textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
                lineHeight: block.styles.lineHeight || 'inherit',
                letterSpacing: block.styles.letterSpacing || 'inherit',
                outline: 'none',
                minHeight: '1.2em',
                wordBreak: 'break-word' as const,
              }}
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
          )}
        </>
      ) : (
        renderBlock(block, globalStyles)
      )}
      </div>
    </div>
  );
}
