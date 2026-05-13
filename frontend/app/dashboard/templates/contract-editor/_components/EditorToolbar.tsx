'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Minus, Undo, Redo,
} from 'lucide-react';
import type { BlockMeta } from '../_lib/types';

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
      <TB active={e.isActive('heading', { level: 1 })} onClick={() => e.chain().focus().toggleHeading({ level: 1 }).run()} title="Titre 1">
        <span className="text-[11px] font-bold">H1</span>
      </TB>
      <TB active={e.isActive('heading', { level: 2 })} onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre 2">
        <span className="text-[11px] font-bold">H2</span>
      </TB>
      <TB active={e.isActive('heading', { level: 3 })} onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()} title="Titre 3">
        <span className="text-[11px] font-bold">H3</span>
      </TB>
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
