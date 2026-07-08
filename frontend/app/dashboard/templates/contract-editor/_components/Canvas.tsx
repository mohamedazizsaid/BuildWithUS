'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import { GripVertical, Copy, Trash2 as TrashIcon } from 'lucide-react';
import toast from '@/lib/toast';
import { resolveBlock } from '../_lib/blocks';
import { replaceAllVariableNodes } from '../_lib/variable-mapping';
import type { BlockMeta, FloatingImage, FloatingSignature } from '../_lib/types';
import { FloatingImages } from './FloatingImages';
import { FloatingSignatures } from './FloatingSignatures';

export function ContractCanvas({
  editor,
  onBlockSelect,
  bgColor = '#ffffff',
  floatingImages = [],
  selectedImageId = null,
  onSelectImage,
  onUpdateImage,
  onRemoveImage,
  floatingSignatures = [],
  selectedSignatureId = null,
  onSelectSignature,
  onUpdateSignature,
  onRemoveSignature,
}: {
  readonly editor: Editor | null;
  readonly onBlockSelect?: (b: BlockMeta | null) => void;
  readonly bgColor?: string;
  readonly floatingImages?: FloatingImage[];
  readonly selectedImageId?: string | null;
  readonly onSelectImage?: (id: string | null) => void;
  readonly onUpdateImage?: (id: string, patch: Partial<FloatingImage>) => void;
  readonly onRemoveImage?: (id: string) => void;
  readonly floatingSignatures?: FloatingSignature[];
  readonly selectedSignatureId?: string | null;
  readonly onSelectSignature?: (id: string | null) => void;
  readonly onUpdateSignature?: (id: string, patch: Partial<FloatingSignature>) => void;
  readonly onRemoveSignature?: (id: string) => void;
}) {
  const canvasRef  = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  const [hovered,  setHovered]  = useState<BlockMeta | null>(null);
  const [selected, setSelected] = useState<BlockMeta | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const draggingRef = useRef<{ from: number; to: number } | null>(null);

  // Track rendered canvas height to draw fake A4 page-break lines.
  // Why: TipTap Pro's pagination requires a paid licence — we fake it with
  // a horizontal divider every 297mm so the user can see where pages split.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const pxPerMm = rect.width / 210;
      const pageHeightPx = 297 * pxPerMm;
      setPageCount(Math.max(1, Math.ceil(rect.height / pageHeightPx)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { onBlockSelect?.(selected); }, [selected, onBlockSelect]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const clear = () => setHovered(null);
    el.addEventListener('scroll', clear, { passive: true });
    return () => el.removeEventListener('scroll', clear);
  }, []);

  useEffect(() => {
    if (!editor || !selected || !canvasRef.current) return;
    const update = () => {
      if (!canvasRef.current) return;
      let node = null;
      try { node = editor.state.doc.nodeAt(selected.from); } catch { setSelected(null); return; }
      if (!node) { setSelected(null); return; }
      try {
        const domResult = editor.view.domAtPos(selected.from);
        let el: Element | null = domResult.node instanceof Element
          ? domResult.node : (domResult.node.parentElement ?? null);
        while (el && el.parentElement && !el.parentElement.classList.contains('tiptap')) {
          el = el.parentElement;
        }
        if (!el || !canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const elRect     = el.getBoundingClientRect();
        setSelected((prev) => prev ? {
          ...prev,
          top:    elRect.top   - canvasRect.top,
          height: elRect.height,
          left:   elRect.left  - canvasRect.left,
          right:  canvasRect.right - elRect.right,
        } : null);
      } catch { /* ignore if position no longer exists */ }
    };
    editor.on('update', update);
    return () => { editor.off('update', update); };
  }, [editor, selected]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editor || !canvasRef.current) return;
    setHovered(resolveBlock(editor, e.clientX, e.clientY, canvasRef.current));
  }, [editor]);

  const onClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editor || !canvasRef.current) return;
    const meta = resolveBlock(editor, e.clientX, e.clientY, canvasRef.current);
    setSelected(meta);
    onSelectImage?.(null);
  }, [editor, onSelectImage]);

  const clearSelection = useCallback(() => setSelected(null), []);

  const handleDelete = useCallback(() => {
    if (!editor || !selected) return;
    let node = null;
    try { node = editor.state.doc.nodeAt(selected.from); } catch { setSelected(null); return; }
    if (!node) { setSelected(null); return; }
    const to = selected.from + node.nodeSize;
    editor.chain().focus().deleteRange({ from: selected.from, to }).run();
    setSelected(null);
  }, [editor, selected]);

  const handleDuplicate = useCallback(() => {
    if (!editor || !selected) return;
    let node = null;
    try { node = editor.state.doc.nodeAt(selected.from); } catch { return; }
    if (!node) return;
    const insertAt = selected.from + node.nodeSize;
    if (insertAt > editor.state.doc.content.size) return;
    try { editor.chain().focus().insertContentAt(insertAt, node.toJSON()).run(); }
    catch { /* ignore non-duplicable nodes */ }
    setSelected(null);
  }, [editor, selected]);

  const onGripDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!selected) return;
    draggingRef.current = { from: selected.from, to: selected.to };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('block-reorder', '1');
  }, [selected]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e.dataTransfer.getData('block-reorder') && draggingRef.current && editor) {
      const { from } = draggingRef.current;
      draggingRef.current = null;
      const node = editor.state.doc.nodeAt(from);
      if (!node) return;
      const nodeSize = node.nodeSize;

      const dropRes = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!dropRes) return;
      const $drop = editor.state.doc.resolve(dropRes.pos);
      if ($drop.depth < 1) return;
      const dropTarget = $drop.before(1);
      if (dropTarget === from) return;

      let { tr } = editor.state;
      const moved = editor.state.schema.nodeFromJSON(node.toJSON());
      if (dropTarget < from) {
        tr = tr.insert(dropTarget, moved);
        tr = tr.delete(from + nodeSize, from + nodeSize + nodeSize);
      } else {
        tr = tr.delete(from, from + nodeSize);
        tr = tr.insert(dropTarget - nodeSize, moved);
      }
      editor.view.dispatch(tr);
      setSelected(null);
      return;
    }

    const varName = e.dataTransfer.getData('variable-name');
    if (varName && editor) {
      const varLabel = e.dataTransfer.getData('variable-label') || null;

      const emptySlotEl = (e.target as HTMLElement).closest('[data-empty-slot]') as HTMLElement | null;
      if (emptySlotEl) {
        const attrKey = emptySlotEl.getAttribute('data-empty-slot');
        if (attrKey) {
          const setAttr = (pos: number, attrs: Record<string, unknown>) => {
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(pos, undefined, { ...attrs, [attrKey]: varName }),
            );
            toast.success(`Variable "${varLabel ?? varName}" assignée`);
          };

          const coordsPos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
          if (coordsPos) {
            try {
              const directNode = editor.state.doc.nodeAt(coordsPos.pos);
              if (directNode?.attrs && attrKey in directNode.attrs) {
                setAttr(coordsPos.pos, directNode.attrs as Record<string, unknown>);
                return;
              }
              const $pos = editor.state.doc.resolve(coordsPos.pos);
              for (let d = $pos.depth; d >= 1; d--) {
                const nodePos = $pos.before(d);
                const blockNode = editor.state.doc.nodeAt(nodePos);
                if (blockNode?.attrs && attrKey in blockNode.attrs) {
                  setAttr(nodePos, blockNode.attrs as Record<string, unknown>);
                  return;
                }
              }
            } catch { /* ignore */ }
          }

          const tiptapEl = canvasRef.current?.querySelector('.tiptap');
          if (tiptapEl) {
            let blockEl: Element | null = emptySlotEl;
            while (blockEl && blockEl.parentElement && !blockEl.parentElement.classList.contains('tiptap')) {
              blockEl = blockEl.parentElement;
            }
            if (blockEl && blockEl.parentElement) {
              const childIdx = Array.from(tiptapEl.children).indexOf(blockEl as HTMLElement);
              if (childIdx >= 0) {
                try {
                  const pos = editor.view.posAtDOM(tiptapEl, childIdx);
                  const node = editor.state.doc.nodeAt(pos);
                  if (node?.attrs && attrKey in node.attrs) {
                    setAttr(pos, node.attrs as Record<string, unknown>);
                    return;
                  }
                } catch { /* ignore */ }
              }
            }
          }
          return;
        }
      }

      const targetEl = (e.target as HTMLElement).closest('[data-variable]') as HTMLElement | null;
      const targetVarName = targetEl?.getAttribute('data-variable') ?? null;

      if (targetVarName && targetVarName !== varName) {
        const count = replaceAllVariableNodes(editor, targetVarName, varName, varLabel);
        if (count > 0) {
          toast.success(
            `"{{${targetVarName}}}" → "${varLabel ?? varName}" (${count} occurrence${count > 1 ? 's' : ''})`,
          );
        }
        return;
      }

      const view = editor.view;
      const pos  = view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!pos) return;
      const vNode = view.state.schema.nodes.variable?.create({ name: varName, label: varLabel });
      if (!vNode) return;
      view.dispatch(view.state.tr.insert(pos.pos, vNode));
    }
  }, [editor]);

  const active = selected ?? hovered;
  const isSelected = !!selected;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-slate-100 p-8"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={(e) => { if (e.target === scrollRef.current) clearSelection(); }}
    >
      <div
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHovered(null)}
        onClick={onClick}
        className="shadow-sm mx-auto contract-canvas"
        style={{
          position:   'relative',
          width:      '210mm',
          minHeight:  '297mm',
          padding:    '18mm 22mm',
          fontFamily: 'Arial, sans-serif',
          color:      '#1a1a1a',
          fontSize:   '10pt',
          lineHeight: '1.75',
          background: bgColor,
        }}
      >
        {editor && <EditorContent editor={editor} />}

        {/* Fake page-break separators — drawn every 297mm down the canvas. */}
        {Array.from({ length: pageCount - 1 }, (_, i) => i + 1).map((breakAt) => (
          <div
            key={breakAt}
            style={{
              position:      'absolute',
              top:           `${breakAt * 297}mm`,
              left:          '-22mm',
              right:         '-22mm',
              height:        0,
              borderTop:     '2px dashed #cbd5e1',
              pointerEvents: 'none',
              zIndex:        20,
            }}
          >
            <div style={{
              position:    'absolute',
              top:         -10,
              left:        '50%',
              transform:   'translateX(-50%)',
              background:  '#f1f5f9',
              color:       '#64748b',
              fontSize:    10,
              fontWeight:  600,
              padding:     '2px 10px',
              borderRadius: 10,
              border:      '1px solid #cbd5e1',
              whiteSpace:  'nowrap',
              letterSpacing: 0.3,
            }}>
              Page {breakAt} / {pageCount} — Page {breakAt + 1}
            </div>
          </div>
        ))}

        {/* Total page count badge — top-right corner of the canvas. */}
        <div style={{
          position:      'absolute',
          top:           8,
          right:         8,
          background:    'rgba(241, 245, 249, 0.9)',
          color:         '#64748b',
          fontSize:      10,
          fontWeight:    600,
          padding:       '2px 8px',
          borderRadius:  10,
          border:        '1px solid #cbd5e1',
          pointerEvents: 'none',
          zIndex:        20,
          letterSpacing: 0.3,
        }}>
          {pageCount} page{pageCount > 1 ? 's' : ''}
        </div>

        {onSelectImage && onUpdateImage && onRemoveImage && (
          <FloatingImages
            images={floatingImages}
            selectedId={selectedImageId}
            onSelect={onSelectImage}
            onUpdate={onUpdateImage}
            onRemove={onRemoveImage}
            pageRef={canvasRef}
          />
        )}

        {onSelectSignature && onUpdateSignature && onRemoveSignature && (
          <FloatingSignatures
            signatures={floatingSignatures}
            selectedId={selectedSignatureId}
            onSelect={onSelectSignature}
            onUpdate={onUpdateSignature}
            onRemove={onRemoveSignature}
            pageRef={canvasRef}
          />
        )}

        {active && (
          <div
            style={{
              position:      'absolute',
              top:           active.top,
              left:          active.left,
              right:         active.right,
              height:        active.height,
              pointerEvents: 'none',
              zIndex:        40,
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              outline:  isSelected ? '2px solid #3b82f6' : '2px dashed #93c5fd',
              outlineOffset: '-2px',
              borderRadius: 2,
              transition: 'outline 80ms',
            }} />

            <div
              style={{
                position:   'absolute',
                top:        -20,
                left:       0,
                height:     20,
                display:    'flex',
                alignItems: 'center',
                gap:        4,
                padding:    '0 8px',
                background: isSelected ? '#3b82f6' : '#93c5fd',
                color:      'white',
                fontSize:   '10px',
                fontWeight: 600,
                borderRadius: '4px 4px 0 0',
                pointerEvents: 'none',
                userSelect: 'none',
                transition: 'background 80ms',
                whiteSpace: 'nowrap',
              }}
            >
              {active.label}
            </div>

            {isSelected && (
              <div
                style={{
                  position:      'absolute',
                  top:           '50%',
                  left:          -36,
                  transform:     'translateY(-50%)',
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           4,
                  pointerEvents: 'auto',
                }}
              >
                <div
                  draggable
                  onDragStart={onGripDragStart}
                  title="Glisser pour réordonner"
                  style={{
                    width: 28, height: 28, background: 'white',
                    border: '1px solid #e2e8f0', borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'grab', boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                  }}
                  className="hover:border-blue-300 hover:text-blue-500 transition-colors"
                >
                  <GripVertical size={13} className="text-slate-400" />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}
                  title="Dupliquer"
                  style={{
                    width: 28, height: 28, background: 'white',
                    border: '1px solid #e2e8f0', borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                  }}
                  className="hover:border-indigo-300 hover:text-indigo-500 transition-colors"
                >
                  <Copy size={12} className="text-slate-400" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  title="Supprimer"
                  style={{
                    width: 28, height: 28, background: 'white',
                    border: '1px solid #e2e8f0', borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                  }}
                  className="hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  <TrashIcon size={12} className="text-slate-400" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
