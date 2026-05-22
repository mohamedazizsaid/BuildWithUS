'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Minus, Undo, Redo, ChevronDown, Baseline,
} from 'lucide-react';
import type { BlockMeta } from '../_lib/types';

const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '40px', '48px', '56px', '64px'];

const TEXT_COLORS = [
  '#1a1a1a', '#475569', '#94a3b8', '#ffffff',
  '#dc2626', '#ea580c', '#d97706', '#ca8a04',
  '#16a34a', '#059669', '#0891b2', '#2563eb',
  '#1d4ed8', '#7c3aed', '#c026d3', '#db2777',
];

// Apply / clear an inline mark via a raw ProseMirror transaction. Used instead
// of editor.chain().setMark(...) so we don't depend on addCommands wiring (which
// can fail silently on HMR reloads).
function applyInlineMark(editor: Editor, markName: string, attrs: Record<string, unknown> | null) {
  const { state, view } = editor;
  const markType = state.schema.marks[markName];
  if (!markType) {
    console.warn(`[toolbar] mark "${markName}" not in editor schema — extension not loaded? Hard-refresh the page.`);
    return;
  }
  const { from, to, empty } = state.selection;
  if (empty) {
    // Store mark so the next typed char inherits it.
    const stored = attrs ? markType.create(attrs) : null;
    const tr = state.tr.setStoredMarks(stored ? [stored] : []);
    view.dispatch(tr);
    view.focus();
    return;
  }
  let tr = state.tr.removeMark(from, to, markType);
  if (attrs) tr = tr.addMark(from, to, markType.create(attrs));
  view.dispatch(tr);
  view.focus();
}

function TextColorDropdown({ editor }: { readonly editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentColor = (editor.getAttributes('textColor').color as string | undefined) ?? '#1a1a1a';

  const apply = (color: string) => applyInlineMark(editor, 'textColor', { color });
  const clear = () => applyInlineMark(editor, 'textColor', null);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handleOpen = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        onMouseDown={(e) => { e.preventDefault(); open ? setOpen(false) : handleOpen(); }}
        title="Couleur du texte"
        className="h-7 px-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-0.5 transition-colors shrink-0"
      >
        <div className="flex flex-col items-center">
          <Baseline size={14} />
          <div className="w-3.5 h-1 rounded-sm" style={{ background: currentColor }} />
        </div>
        <ChevronDown size={11} className="text-slate-400" />
      </button>
      {open && pos && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="rounded-lg border border-border bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-2"
        >
          <div className="grid grid-cols-4 gap-1.5">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                title={c}
                onMouseDown={(e) => { e.preventDefault(); apply(c); setOpen(false); }}
                className="w-6 h-6 rounded-md hover:scale-110 transition-transform"
                style={{
                  background: c,
                  border: currentColor === c ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                }}
              />
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
            <label className="text-[10px] text-slate-500 cursor-pointer flex items-center gap-1.5">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => apply(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border border-slate-200"
              />
              Personnalisé
            </label>
            <button
              onMouseDown={(e) => { e.preventDefault(); clear(); setOpen(false); }}
              className="ml-auto text-[10px] text-slate-400 hover:text-slate-700 transition-colors"
            >
              ↺ Réinitialiser
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function FontSizeDropdown({ editor }: { readonly editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Snapshot of the original fontSize at the moment the menu opens — restored
  // if the user dismisses without committing, so hover-preview never sticks.
  const originalRef = useRef<string | null>(null);
  const committedRef = useRef(false);

  const currentSize = (editor.getAttributes('fontSize').size as string | undefined) ?? '';

  const applyPreview = (size: string) => {
    applyInlineMark(editor, 'fontSize', { size });
  };

  const restoreOriginal = () => {
    if (originalRef.current) applyInlineMark(editor, 'fontSize', { size: originalRef.current });
    else applyInlineMark(editor, 'fontSize', null);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      if (!committedRef.current) restoreOriginal();
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handleOpen = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
    originalRef.current = (editor.getAttributes('fontSize').size as string | undefined) ?? null;
    committedRef.current = false;
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        onMouseDown={(e) => { e.preventDefault(); open ? setOpen(false) : handleOpen(); }}
        title="Taille de police"
        className="h-7 px-2 rounded text-[11px] text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1 transition-colors shrink-0"
      >
        <span className="font-medium min-w-7 text-left">{currentSize ? currentSize.replace('px', '') : 'Taille'}</span>
        <ChevronDown size={11} className="text-slate-400" />
      </button>
      {open && pos && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-28 max-h-64 overflow-y-auto rounded-lg border border-border bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1"
          onMouseLeave={() => { if (!committedRef.current) restoreOriginal(); }}
        >
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              onMouseEnter={() => applyPreview(s)}
              onMouseDown={(e) => {
                e.preventDefault();
                applyPreview(s);
                committedRef.current = true;
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1 text-xs hover:bg-slate-100 transition-colors ${currentSize === s ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600'}`}
            >
              {s.replace('px', '')}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

const CUSTOM_BLOCK_TYPES = new Set([
  'contractHeader',
  'financialBlock', 'definitionsBlock', 'infoBox', 'partiesBlock',
  'formFieldsBlock', 'checkboxBlock', 'signatureBlock', 'sepaBlock', 'retractBlock',
]);

const BG_SWATCHES = [
  { v: '#ffffff', t: 'Blanc' },
  { v: '#f8fafc', t: 'Ardoise' },
  { v: '#f1f5f9', t: 'Gris' },
  { v: '#eff6ff', t: 'Bleu clair' },
  { v: '#f0fdf4', t: 'Vert clair' },
  { v: '#fffbeb', t: 'Ambre clair' },
  { v: '#fff1f2', t: 'Rose clair' },
  { v: '#eef2ff', t: 'Indigo clair' },
];

const ACCENT_SWATCHES = [
  { v: '#0f172a', t: 'Ardoise' },
  { v: '#1d4ed8', t: 'Bleu' },
  { v: '#059669', t: 'Vert' },
  { v: '#ea580c', t: 'Orange' },
  { v: '#7c3aed', t: 'Violet' },
  { v: '#db2777', t: 'Rose' },
  { v: '#0891b2', t: 'Cyan' },
  { v: '#d97706', t: 'Ambre' },
];

function TB({
  active, onClick, children, title,
}: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title?: string;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor, selectedBlock }: {
  readonly editor: Editor | null;
  readonly selectedBlock: BlockMeta | null;
}) {
  if (!editor) return null;
  const e = editor;

  const isCustomBlock = !!(selectedBlock && CUSTOM_BLOCK_TYPES.has(selectedBlock.nodeType));

  const resolveSelectedPos = (): { pos: number; node: ReturnType<typeof editor.state.doc.nodeAt> } | null => {
    if (!editor || !selectedBlock) return null;
    try {
      const docSize = editor.state.doc.content.size;
      const safePos = Math.min(Math.max(0, selectedBlock.from), Math.max(0, docSize - 1));
      let pos  = safePos;
      let node = editor.state.doc.nodeAt(pos);
      if (!node || node.type.name !== selectedBlock.nodeType) {
        const $p = editor.state.doc.resolve(safePos);
        pos  = $p.depth > 0 ? $p.before(1) : 0;
        node = editor.state.doc.nodeAt(pos);
      }
      if (!node || node.type.name !== selectedBlock.nodeType) return null;
      return { pos, node };
    } catch { return null; }
  };

  const setBlockAttr = (key: string, value: string) => {
    const resolved = resolveSelectedPos();
    if (!resolved) return;
    try {
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(resolved.pos, undefined, { ...resolved.node!.attrs, [key]: value }),
      );
    } catch { /* ignore */ }
  };

  const resetBlockColors = () => {
    const resolved = resolveSelectedPos();
    if (!resolved) return;
    try {
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(resolved.pos, undefined, { ...resolved.node!.attrs, blockBg: '', blockAccent: '' }),
      );
    } catch { /* ignore */ }
  };

  const resolved      = resolveSelectedPos();
  const currentBg     = resolved?.node?.attrs.blockBg     ?? '';
  const currentAccent = resolved?.node?.attrs.blockAccent ?? '';

  return (
    <div className="h-9 border-b border-border bg-white flex items-center gap-0.5 px-3 shrink-0 overflow-x-auto">
      <TB onClick={() => e.chain().focus().undo().run()} title="Annuler"><Undo size={14} /></TB>
      <TB onClick={() => e.chain().focus().redo().run()} title="Rétablir"><Redo size={14} /></TB>
      <div className="w-px h-4 bg-border mx-1 shrink-0" />
      <TB active={e.isActive('bold')} onClick={() => e.chain().focus().toggleBold().run()} title="Gras"><Bold size={14} /></TB>
      <TB active={e.isActive('italic')} onClick={() => e.chain().focus().toggleItalic().run()} title="Italique"><Italic size={14} /></TB>
      <TB active={e.isActive('underline')} onClick={() => e.chain().focus().toggleUnderline().run()} title="Souligné"><UnderlineIcon size={14} /></TB>
      <div className="w-px h-4 bg-border mx-1 shrink-0" />
      <FontSizeDropdown editor={e} />
      <TextColorDropdown editor={e} />
      <div className="w-px h-4 bg-border mx-1 shrink-0" />
      <TB active={e.isActive({ textAlign: 'left' })} onClick={() => e.chain().focus().setTextAlign('left').run()} title="Gauche"><AlignLeft size={14} /></TB>
      <TB active={e.isActive({ textAlign: 'center' })} onClick={() => e.chain().focus().setTextAlign('center').run()} title="Centré"><AlignCenter size={14} /></TB>
      <TB active={e.isActive({ textAlign: 'right' })} onClick={() => e.chain().focus().setTextAlign('right').run()} title="Droite"><AlignRight size={14} /></TB>
      <div className="w-px h-4 bg-border mx-1 shrink-0" />
      <TB active={e.isActive('bulletList')} onClick={() => e.chain().focus().toggleBulletList().run()} title="Liste"><List size={14} /></TB>
      <TB active={e.isActive('orderedList')} onClick={() => e.chain().focus().toggleOrderedList().run()} title="Liste numérotée"><ListOrdered size={14} /></TB>
      <TB onClick={() => e.chain().focus().setHorizontalRule().run()} title="Séparateur"><Minus size={14} /></TB>

      {isCustomBlock && (
        <>
          <div className="w-px h-4 bg-border mx-1.5 shrink-0" />
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide shrink-0 mr-1">Fond</span>
          {BG_SWATCHES.map(({ v, t }) => (
            <button
              key={v}
              title={t}
              onMouseDown={(ev) => { ev.preventDefault(); setBlockAttr('blockBg', v); }}
              style={{
                width: 14, height: 14,
                borderRadius: '50%',
                background: v,
                border: currentBg === v ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                flexShrink: 0,
                cursor: 'pointer',
                outline: 'none',
              }}
            />
          ))}
          <div className="w-px h-4 bg-border mx-1.5 shrink-0" />
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide shrink-0 mr-1">Accent</span>
          {ACCENT_SWATCHES.map(({ v, t }) => (
            <button
              key={v}
              title={t}
              onMouseDown={(ev) => { ev.preventDefault(); setBlockAttr('blockAccent', v); }}
              style={{
                width: 14, height: 14,
                borderRadius: '50%',
                background: v,
                border: currentAccent === v ? '2px solid #3b82f6' : '1px solid transparent',
                flexShrink: 0,
                cursor: 'pointer',
                outline: 'none',
              }}
            />
          ))}
          <button
            title="Réinitialiser les couleurs"
            onMouseDown={(ev) => { ev.preventDefault(); resetBlockColors(); }}
            className="ml-1 text-[9px] text-slate-400 hover:text-slate-700 border border-slate-200 hover:border-slate-400 rounded px-1.5 py-0.5 shrink-0 transition-colors"
          >
            ↺
          </button>
        </>
      )}
    </div>
  );
}
