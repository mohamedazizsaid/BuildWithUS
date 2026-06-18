'use client';

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BlockData } from '@/lib/editor-types';
import { LIST_ICONS, DEFAULT_LIST_ICON } from '@/lib/list-icons';

// Inline-editable text span. Its content is set ONCE on mount; re-renders must
// never touch it (otherwise the caret jumps while typing). The DOM is the source
// of truth between mount and blur — saveAll() reads it back on demand.
function EditableText({
  initial, placeholder, onBlur, style,
}: { initial: string; placeholder: string; onBlur: () => void; style: React.CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = initial;
    // intentional: mount-only. Deps would overwrite text mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span
      ref={ref}
      data-il-text=""
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      className="block-editable-placeholder"
      onBlur={onBlur}
      style={style}
    />
  );
}

export function EditableIconList({
  block, onUpdate,
}: { block: BlockData; onUpdate: (updates: Partial<BlockData>) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  // The picker floats in a portal (fixed position) so the block's overflow:hidden
  // can't clip it. We anchor it to the clicked glyph's screen rect.
  const [picker, setPicker] = useState<{ index: number; top: number; left: number } | null>(null);

  // Close the floating picker on outside-click, scroll, resize or Escape.
  useEffect(() => {
    if (!picker) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPicker(null);
    };
    const onScroll = () => setPicker(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicker(null); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('keydown', onKey);
    };
  }, [picker]);

  const openPicker = (i: number, e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPicker((cur) => (cur?.index === i ? null : { index: i, top: r.bottom + 4, left: r.left }));
  };

  const items = (block.content.items || []) as string[][];
  const align = (block.content.align as string) || 'left';
  const iconColor = block.styles.iconColor || '#16a34a';
  const iconSize = block.styles.iconSize || '20px';
  const spacing = block.styles.spacing || '12px';
  const color = block.styles.color || 'inherit';
  const fontSize = block.styles.fontSize || 'inherit';
  const fontWeight = block.styles.fontWeight || 'inherit';
  const fontFamily = block.styles.fontFamily || 'inherit';
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  // Latest committed items, kept fresh so structural edits don't use a stale closure.
  const dataRef = useRef(items);
  useEffect(() => { dataRef.current = (block.content.items || []) as string[][]; }, [block.content.items]);

  // Read every editable text from the DOM (document order === items order).
  const saveAll = () => {
    if (!rootRef.current) return;
    const texts = [...rootRef.current.querySelectorAll('[data-il-text]')].map((el) => el.textContent || '');
    const next = dataRef.current.map((it, i) => [it[0] ?? DEFAULT_LIST_ICON, texts[i] ?? it[1] ?? '']);
    dataRef.current = next;
    onUpdate({ content: { ...block.content, items: next } });
  };

  const setGlyph = (i: number, glyph: string) => {
    saveAll();
    const next = dataRef.current.map((it, idx) => (idx === i ? [glyph, it[1] ?? ''] : it));
    onUpdate({ content: { ...block.content, items: next } });
    setPicker(null);
  };
  const addItem = () => {
    saveAll();
    const next = [...dataRef.current, [DEFAULT_LIST_ICON, '']];
    onUpdate({ content: { ...block.content, items: next } });
  };
  const removeItem = (i: number) => {
    saveAll();
    const next = dataRef.current.filter((_, idx) => idx !== i);
    onUpdate({ content: { ...block.content, items: next } });
  };

  const textStyle: React.CSSProperties = {
    color, fontSize, fontWeight, fontFamily,
    lineHeight: 1.4, outline: 'none', minWidth: '40px', display: 'inline-block',
  };

  return (
    <div
      ref={rootRef}
      onClick={(e) => e.stopPropagation()}
      style={{ padding: block.styles.padding || '10px', display: 'flex', flexDirection: 'column', gap: spacing }}
    >
      {items.map(([glyph, text], i) => (
        <div
          key={`row-${i}-${items.length}`}
          className="group/ilrow"
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: justify, gap: '8px', position: 'relative' }}
        >
          {/* Glyph — click to change the icon */}
          <button
            onClick={(e) => openPicker(i, e)}
            title="Changer l'icône"
            style={{ color: iconColor, fontSize: iconSize, lineHeight: 1.4, flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
          >
            {glyph || DEFAULT_LIST_ICON}
          </button>

          {/* Text — edited inline on the canvas */}
          <EditableText
            key={`txt-${i}-${items.length}`}
            initial={text}
            placeholder="Votre texte"
            onBlur={saveAll}
            style={textStyle}
          />

          {/* Remove — top-right of the row, doesn't affect alignment */}
          {items.length > 1 && (
            <button
              onClick={() => removeItem(i)}
              className="opacity-0 group-hover/ilrow:opacity-100 transition-opacity"
              style={{ position: 'absolute', right: 0, top: 0, width: 16, height: 16, borderRadius: '9999px', background: '#ef4444', color: '#fff', fontSize: 10, lineHeight: '16px', textAlign: 'center', border: 'none', cursor: 'pointer' }}
              title="Supprimer"
            >×</button>
          )}

        </div>
      ))}

      {/* Floating icon picker — portaled to body so the block's overflow:hidden
          can't clip it; positioned (fixed) under the clicked glyph. */}
      {picker && typeof document !== 'undefined' && createPortal(
        <div
          ref={pickerRef}
          className="fixed z-1000 grid grid-cols-6 gap-1 p-2 rounded-md border border-border bg-background shadow-xl"
          style={{ top: picker.top, left: picker.left, width: 220 }}
        >
          {LIST_ICONS.map((ic) => {
            const current = picker.index < items.length ? items[picker.index][0] : '';
            return (
              <button
                key={ic.glyph}
                onClick={() => setGlyph(picker.index, ic.glyph)}
                title={ic.label}
                className={`h-7 flex items-center justify-center rounded text-base leading-none hover:bg-muted transition-colors ${current === ic.glyph ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
                style={{ color: iconColor }}
              >
                {ic.glyph}
              </button>
            );
          })}
        </div>,
        document.body,
      )}

      {/* Add item */}
      <button
        onClick={addItem}
        className="self-start mt-1 flex items-center gap-1 text-[11px] font-medium text-blue-500 hover:text-blue-600 transition-colors"
      >
        + Élément
      </button>
    </div>
  );
}
