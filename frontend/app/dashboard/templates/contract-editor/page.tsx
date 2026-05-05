'use client';

import { Suspense, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  ArrowLeft, Save, Download, RefreshCw, ChevronDown, Plus,
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Minus, Undo, Redo, FileText, X, CheckCircle2,
  GripVertical, Copy, Trash2 as TrashIcon, Upload, AlertTriangle,
} from 'lucide-react';
import { templates, contractVariables } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { VariableNode, extractVariablesFromTiptap, renderTiptapToHtml } from '@/lib/tiptap/variable-node';
import { VarLabelsContext } from '@/lib/tiptap/var-labels-context';
import { ContractHeader } from '@/lib/tiptap/contract-header';
import { ALL_CONTRACT_BLOCKS } from '@/lib/tiptap/contract-blocks';
import { CONTRACT_TEMPLATES, VARIABLE_PALETTE } from '@/lib/tiptap/contract-templates';
import toast from 'react-hot-toast';
import type { JSONContent, Editor } from '@tiptap/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractType = 'b2c' | 'b2b' | 'web' | 'abonnement' | 'aop';

const CONTRACT_TYPES: Record<ContractType, { label: string; color: string }> = {
  b2c:        { label: 'B2C — Particulier',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  b2b:        { label: 'B2B — Entreprise',     color: 'bg-violet-50 text-violet-700 border-violet-200' },
  web:        { label: 'Web / E-commerce',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  aop:        { label: "Appel d'Offre Public", color: 'bg-amber-50 text-amber-700 border-amber-200' },
  abonnement: { label: 'Abonnement / Télécom', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SlashMenuItem =
  | { type: 'variable'; key: string; name: string; label: string; category: string }
  | { type: 'block'; key: string; label: string; description: string; color: string; build: () => Record<string, unknown> };

function parseCsvHeaders(text: string): string[] {
  const line = text.split(/\r?\n/)[0] ?? '';
  const headers: string[] = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { headers.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  if (cur.trim()) headers.push(cur.trim());
  return headers.filter(Boolean);
}

// ─── Variable Palette ─────────────────────────────────────────────────────────

// Block library — predefined contract block types insertable at the cursor.
const BLOCK_LIBRARY: { type: string; label: string; description: string; color: string; build: () => Record<string, unknown> }[] = [
  {
    type: 'financialBlock', label: 'Récapitulatif financier',
    description: 'Tableau HT / TVA / TTC',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    build: () => ({ type: 'financialBlock' }),
  },
  {
    type: 'definitionsBlock', label: 'Définitions',
    description: 'Liste de termes contractuels',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    build: () => ({
      type: 'definitionsBlock',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Service : prestation décrite à l\'article 1.' }] }],
    }),
  },
  {
    type: 'partiesBlock', label: 'Parties',
    description: 'Bloc d\'introduction des parties',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    build: () => ({
      type: 'partiesBlock',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Entre les soussignés…' }] }],
    }),
  },
  {
    type: 'infoBox', label: 'Encadré info',
    description: 'Préambule, mention légale',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    build: () => ({
      type: 'infoBox',
      attrs: { variant: 'info', title: 'PRÉAMBULE' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texte d\'introduction…' }] }],
    }),
  },
  {
    type: 'infoBox', label: 'Avertissement',
    description: 'Encadré jaune (warning)',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    build: () => ({
      type: 'infoBox',
      attrs: { variant: 'warning', title: '' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '⚠️ Information importante…' }] }],
    }),
  },
  {
    type: 'formFieldsBlock', label: 'Formulaire',
    description: 'Champs à remplir manuellement',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    build: () => ({
      type: 'formFieldsBlock',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Nom : ___' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Prénom : ___' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Email : ___' }] },
      ],
    }),
  },
  {
    type: 'checkboxBlock', label: 'Cases à cocher',
    description: 'Liste d\'options sélectionnables',
    color: 'bg-green-50 text-green-700 border-green-200',
    build: () => ({
      type: 'checkboxBlock',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '☐ Option 1' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '☐ Option 2' }] },
      ],
    }),
  },
  {
    type: 'signatureBlock', label: 'Signatures',
    description: 'Lignes de signature',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    build: () => ({ type: 'signatureBlock' }),
  },
  {
    type: 'sepaBlock', label: 'Mandat SEPA',
    description: 'Autorisation de prélèvement',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    build: () => ({ type: 'sepaBlock' }),
  },
  {
    type: 'retractBlock', label: 'Rétractation',
    description: 'Formulaire 14 jours',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    build: () => ({ type: 'retractBlock' }),
  },
];

interface VariablePaletteProps {
  editor: Editor | null;
  allVars: Record<string, string[]>;
  customVarNames: Set<string>;
  varLabels: Record<string, string>;
  onAddVar: (category: string, name: string) => void;
  onDeleteVar: (category: string, name: string) => void;
  onImportCsv: (headers: string[]) => void;
}

function VariablePalette({ editor, allVars, customVarNames, varLabels, onAddVar, onDeleteVar, onImportCsv }: VariablePaletteProps) {
  const [tab, setTab] = useState<'vars' | 'blocs'>('vars');
  const [open, setOpen] = useState<string | null>('Prestataire');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newVarName, setNewVarName] = useState('');
  const newVarInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingTo) newVarInputRef.current?.focus();
  }, [addingTo]);

  const insertVariable = useCallback((name: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'variable',
      attrs: { name, label: varLabels[name] ?? null },
    }).run();
  }, [editor, varLabels]);

  const insertBlock = useCallback((build: () => Record<string, unknown>) => {
    if (!editor) return;
    editor.chain().focus().insertContent(build()).run();
  }, [editor]);

  const commitNewVar = useCallback((catLabel: string) => {
    const name = newVarName.trim().replace(/\s+/g, '_');
    if (!name) { setAddingTo(null); setNewVarName(''); return; }
    onAddVar(catLabel, name);
    setOpen(catLabel);
    setAddingTo(null);
    setNewVarName('');
  }, [newVarName, onAddVar]);

  const deleteVariable = useCallback((catLabel: string, name: string) => {
    onDeleteVar(catLabel, name);
  }, [onDeleteVar]);

  const handleCsvFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const headers = parseCsvHeaders(text);
      if (headers.length > 0) onImportCsv(headers);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [onImportCsv]);

  // Build display categories: use allVars for var names + VARIABLE_PALETTE for styling
  const displayCategories = Object.keys(allVars).map((label) => {
    const palette = VARIABLE_PALETTE.find(c => c.label === label);
    return {
      label,
      bg: palette?.bg ?? '#f1f5f9',
      color: palette?.color ?? '#334155',
      border: palette?.border ?? '#e2e8f0',
      vars: allVars[label] ?? [],
    };
  });

  return (
    <div className="w-56 border-r border-border bg-slate-50 flex flex-col overflow-hidden shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-border bg-white">
        <button
          onClick={() => setTab('vars')}
          className={`flex-1 px-3 py-2.5 text-[11px] font-semibold transition-colors ${
            tab === 'vars' ? 'text-slate-900 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Variables
        </button>
        <button
          onClick={() => setTab('blocs')}
          className={`flex-1 px-3 py-2.5 text-[11px] font-semibold transition-colors ${
            tab === 'blocs' ? 'text-slate-900 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Blocs
        </button>
      </div>

      {/* CSV hidden input */}
      <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />

      {/* Tab content */}
      {tab === 'vars' && (
        <>
          <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-1">
            <p className="text-[10px] text-slate-400">Glissez ou cliquez pour insérer</p>
            <button
              onClick={() => csvInputRef.current?.click()}
              title="Importer depuis CSV"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors"
            >
              <Upload size={9} /> CSV
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {displayCategories.map((cat) => (
              <div key={cat.label}>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setOpen(open === cat.label ? null : cat.label)}
                    className="flex-1 flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-[11px] font-semibold text-slate-500">{cat.label}</span>
                    <ChevronDown size={11} className={`text-slate-400 transition-transform ${open === cat.label ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAddingTo(cat.label); setOpen(cat.label); }}
                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Ajouter une variable"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                {open === cat.label && (
                  <div className="space-y-0.5 pl-1 mb-1">
                    {cat.vars.map((name) => (
                      <div
                        key={name}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('variable-name', name);
                          e.dataTransfer.setData('variable-label', varLabels[name] ?? '');
                          e.dataTransfer.effectAllowed = 'copy';
                          document.body.classList.add('dragging-variable');
                        }}
                        onDragEnd={() => document.body.classList.remove('dragging-variable')}
                        onClick={() => insertVariable(name)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-grab group"
                      >
                        <div className="flex-1 min-w-0">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0"
                            style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                          >
                            {varLabels[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        </div>
                        {customVarNames.has(name) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteVariable(cat.label, name); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                            title="Supprimer"
                          >
                            <Minus size={9} />
                          </button>
                        )}
                      </div>
                    ))}
                    {addingTo === cat.label && (
                      <div className="px-2 py-1">
                        <input
                          ref={newVarInputRef}
                          value={newVarName}
                          onChange={(e) => setNewVarName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitNewVar(cat.label);
                            if (e.key === 'Escape') { setAddingTo(null); setNewVarName(''); }
                          }}
                          onBlur={() => commitNewVar(cat.label)}
                          placeholder="nom_variable"
                          className="w-full px-2 py-1 text-[10px] font-mono border border-indigo-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'blocs' && (
        <>
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] text-slate-400">Cliquez pour insérer un bloc</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {BLOCK_LIBRARY.map((b, i) => (
              <button
                key={`${b.type}-${i}`}
                onClick={() => insertBlock(b.build)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all hover:shadow-sm ${b.color}`}
              >
                <div className="text-[11px] font-semibold">{b.label}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{b.description}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

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

// ─── Formatting Toolbar ───────────────────────────────────────────────────────

function EditorToolbar({ editor }: { readonly editor: Editor | null }) {
  if (!editor) return null;
  const e = editor;
  return (
    <div className="h-9 border-b border-border bg-white flex items-center gap-0.5 px-3 shrink-0">
      <TB onClick={() => e.chain().focus().undo().run()} title="Annuler"><Undo size={14} /></TB>
      <TB onClick={() => e.chain().focus().redo().run()} title="Rétablir"><Redo size={14} /></TB>
      <div className="w-px h-4 bg-border mx-1" />
      <TB active={e.isActive('bold')} onClick={() => e.chain().focus().toggleBold().run()} title="Gras"><Bold size={14} /></TB>
      <TB active={e.isActive('italic')} onClick={() => e.chain().focus().toggleItalic().run()} title="Italique"><Italic size={14} /></TB>
      <TB active={e.isActive('underline')} onClick={() => e.chain().focus().toggleUnderline().run()} title="Souligné"><UnderlineIcon size={14} /></TB>
      <div className="w-px h-4 bg-border mx-1" />
      <TB active={e.isActive('heading', { level: 1 })} onClick={() => e.chain().focus().toggleHeading({ level: 1 }).run()} title="Titre 1">
        <span className="text-[11px] font-bold">H1</span>
      </TB>
      <TB active={e.isActive('heading', { level: 2 })} onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre 2">
        <span className="text-[11px] font-bold">H2</span>
      </TB>
      <TB active={e.isActive('heading', { level: 3 })} onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()} title="Titre 3">
        <span className="text-[11px] font-bold">H3</span>
      </TB>
      <div className="w-px h-4 bg-border mx-1" />
      <TB active={e.isActive({ textAlign: 'left' })} onClick={() => e.chain().focus().setTextAlign('left').run()} title="Gauche"><AlignLeft size={14} /></TB>
      <TB active={e.isActive({ textAlign: 'center' })} onClick={() => e.chain().focus().setTextAlign('center').run()} title="Centré"><AlignCenter size={14} /></TB>
      <TB active={e.isActive({ textAlign: 'right' })} onClick={() => e.chain().focus().setTextAlign('right').run()} title="Droite"><AlignRight size={14} /></TB>
      <div className="w-px h-4 bg-border mx-1" />
      <TB active={e.isActive('bulletList')} onClick={() => e.chain().focus().toggleBulletList().run()} title="Liste"><List size={14} /></TB>
      <TB active={e.isActive('orderedList')} onClick={() => e.chain().focus().toggleOrderedList().run()} title="Liste numérotée"><ListOrdered size={14} /></TB>
      <TB onClick={() => e.chain().focus().setHorizontalRule().run()} title="Séparateur"><Minus size={14} /></TB>
    </div>
  );
}

// ─── Block labels ─────────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  contractHeader:   'En-tête',
  paragraph:        'Paragraphe',
  heading:          'Titre',
  bulletList:       'Liste',
  orderedList:      'Liste numérotée',
  blockquote:       'Citation',
  horizontalRule:   'Séparateur',
  financialBlock:   'Récapitulatif financier',
  definitionsBlock: 'Définitions',
  infoBox:          'Encadré',
  partiesBlock:     'Parties',
  formFieldsBlock:  'Formulaire',
  checkboxBlock:    'Cases à cocher',
  signatureBlock:   'Signatures',
  sepaBlock:        'Mandat SEPA',
  retractBlock:     'Rétractation',
}

interface BlockMeta {
  label: string; nodeType: string;
  from: number;  to: number;
  top: number;   height: number;
}

function resolveBlock(editor: Editor, clientX: number, clientY: number, canvas: HTMLDivElement): BlockMeta | null {
  try {
    // elementFromPoint works for every DOM element, including contentEditable=false
    // NodeViews (financialBlock, signatureBlock, sepaBlock, etc.) where posAtCoords fails.
    const target = document.elementFromPoint(clientX, clientY);
    if (!target || !canvas.contains(target)) return null;

    // Walk up to the direct child of the Tiptap root (.tiptap)
    let blockEl: Element | null = target;
    while (blockEl && blockEl.parentElement && !blockEl.parentElement.classList.contains('tiptap')) {
      blockEl = blockEl.parentElement;
    }
    if (!blockEl || !blockEl.parentElement) return null;

    // posAtDOM(parent, childIndex) = document position BEFORE that child — works for
    // all node types: text, headings, custom NodeViews, atoms.
    const tiptap     = blockEl.parentElement;
    const childIndex = Array.from(tiptap.children).indexOf(blockEl as HTMLElement);
    if (childIndex < 0) return null;

    const from = editor.view.posAtDOM(tiptap, childIndex);
    if (from < 0 || from >= editor.state.doc.content.size) return null;

    const node = editor.state.doc.nodeAt(from);
    if (!node) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const elRect     = blockEl.getBoundingClientRect();
    return {
      label:    BLOCK_LABELS[node.type.name] ?? 'Bloc',
      nodeType: node.type.name,
      from,
      to:     from + node.nodeSize,  // always fresh from current node size
      top:    elRect.top - canvasRect.top,
      height: elRect.height,
    };
  } catch { return null; }
}

// ─── Replace-all variable mapping helper ─────────────────────────────────────

function replaceAllVariableNodes(
  editor: Editor,
  oldName: string,
  newName: string,
  newLabel: string | null,
) {
  const { state } = editor;
  const varType = state.schema.nodes.variable;
  if (!varType) return 0;

  // Collect inline variable node positions
  const varPositions: Array<{ from: number; to: number }> = [];
  // Collect block nodes whose attributes reference oldName
  const attrUpdates: Array<{ pos: number; newAttrs: Record<string, unknown> }> = [];

  state.doc.descendants((node, pos) => {
    if (node.type === varType && node.attrs.name === oldName) {
      varPositions.push({ from: pos, to: pos + node.nodeSize });
      return false; // no children in atom nodes
    }
    // Check every string attribute for oldName
    const attrs = node.attrs as Record<string, unknown>;
    const updated: Record<string, unknown> = {};
    let changed = false;
    for (const [key, val] of Object.entries(attrs)) {
      if (typeof val === 'string' && val === oldName) {
        updated[key] = newName;
        changed = true;
      }
    }
    if (changed) attrUpdates.push({ pos, newAttrs: { ...attrs, ...updated } });
  });

  const total = varPositions.length + attrUpdates.length;
  if (total === 0) return 0;

  let tr = state.tr;

  // Attribute updates first — no position shifts, safe in any order
  for (const { pos, newAttrs } of attrUpdates) {
    tr = tr.setNodeMarkup(pos, undefined, newAttrs);
  }

  // Variable node replacements in reverse so upstream positions stay valid
  for (const { from, to } of [...varPositions].reverse()) {
    const mFrom = tr.mapping.map(from);
    const mTo   = tr.mapping.map(to);
    tr = tr.replaceWith(mFrom, mTo, varType.create({ name: newName, label: newLabel }));
  }

  editor.view.dispatch(tr);
  return total;
}

// ─── A4 Canvas ────────────────────────────────────────────────────────────────

function ContractCanvas({ editor }: { readonly editor: Editor | null }) {
  const canvasRef  = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  // Hovered block (dashed outline) — cleared on scroll
  const [hovered,  setHovered]  = useState<BlockMeta | null>(null);
  // Selected block (solid outline + controls) — set on click
  const [selected, setSelected] = useState<BlockMeta | null>(null);
  const draggingRef = useRef<{ from: number; to: number } | null>(null);

  // Clear hovered on scroll so the dashed ring doesn't "stick"
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const clear = () => setHovered(null);
    el.addEventListener('scroll', clear, { passive: true });
    return () => el.removeEventListener('scroll', clear);
  }, []);

  // Re-measure the selected block's DOM rect after any editor update so the
  // blue ring tracks the block even as its content grows / shrinks.
  useEffect(() => {
    if (!editor || !selected || !canvasRef.current) return;
    const update = () => {
      if (!canvasRef.current) return;
      const node = editor.state.doc.nodeAt(selected.from);
      if (!node) { setSelected(null); return; }
      // Use posAtDOM-safe lookup: domAtPos works for both text and atom nodes
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
        setSelected((prev) => prev ? { ...prev, top: elRect.top - canvasRect.top, height: elRect.height } : null);
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
  }, [editor]);

  const clearSelection = useCallback(() => setSelected(null), []);

  const handleDelete = useCallback(() => {
    if (!editor || !selected) return;
    // Always recompute `to` from the live document — selected.to can become stale
    const node = editor.state.doc.nodeAt(selected.from);
    if (!node) { setSelected(null); return; }
    const to = selected.from + node.nodeSize;
    editor.chain().focus().deleteRange({ from: selected.from, to }).run();
    setSelected(null);
  }, [editor, selected]);

  const handleDuplicate = useCallback(() => {
    if (!editor || !selected) return;
    const node = editor.state.doc.nodeAt(selected.from);
    if (!node) return;
    // Insert right after the block using the live node size (not the stale to)
    const insertAt = selected.from + node.nodeSize;
    if (insertAt > editor.state.doc.content.size) return;
    try { editor.chain().focus().insertContentAt(insertAt, node.toJSON()).run(); }
    catch { /* ignore non-duplicable nodes */ }
  }, [editor, selected]);

  const onGripDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!selected) return;
    draggingRef.current = { from: selected.from, to: selected.to };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('block-reorder', '1');
  }, [selected]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Block reorder
    if (e.dataTransfer.getData('block-reorder') && draggingRef.current && editor) {
      const { from } = draggingRef.current;
      draggingRef.current = null;
      const node = editor.state.doc.nodeAt(from);
      if (!node) return;
      const nodeSize = node.nodeSize; // live size, not stale

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

    // Variable drop
    const varName = e.dataTransfer.getData('variable-name');
    if (varName && editor) {
      const varLabel = e.dataTransfer.getData('variable-label') || null;

      // ── Empty slot drop: fill a cleared block attribute ──────────────────
      const emptySlotEl = (e.target as HTMLElement).closest('[data-empty-slot]') as HTMLElement | null;
      if (emptySlotEl) {
        const attrKey = emptySlotEl.getAttribute('data-empty-slot');
        if (attrKey) {
          const coordsPos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
          if (coordsPos) {
            try {
              const $pos = editor.state.doc.resolve(coordsPos.pos);
              for (let d = $pos.depth; d >= 0; d--) {
                const nodePos = d > 0 ? $pos.before(d) : 0;
                const blockNode = editor.state.doc.nodeAt(nodePos);
                if (blockNode?.attrs && attrKey in blockNode.attrs) {
                  editor.view.dispatch(
                    editor.state.tr.setNodeMarkup(nodePos, undefined, { ...blockNode.attrs, [attrKey]: varName }),
                  );
                  toast.success(`Variable "${varLabel ?? varName}" assignée`);
                  break;
                }
              }
            } catch { /* ignore */ }
          }
          return;
        }
      }

      // Check if dropped ON an existing variable pill → replace-all mapping
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

      // Normal drop: insert at cursor position
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
      // Clear selection when clicking the gray background outside the canvas
      onClick={(e) => { if (e.target === scrollRef.current) clearSelection(); }}
    >
      <div
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHovered(null)}
        onClick={onClick}
        className="bg-white shadow-sm mx-auto contract-canvas"
        style={{
          position: 'relative',
          width: '210mm',
          minHeight: '297mm',
          padding: '18mm 22mm',
          fontFamily: 'Arial, sans-serif',
          color: '#1a1a1a',
          fontSize: '10pt',
          lineHeight: '1.75',
        }}
      >
        {editor && <EditorContent editor={editor} />}

        {/* ── Block overlay: outline + label tab + controls ── */}
        {active && (
          <div
            style={{
              position:      'absolute',
              top:           active.top,
              left:          0,
              right:         0,
              height:        active.height,
              pointerEvents: 'none',
              zIndex:        40,
            }}
          >
            {/* Outline ring — dashed on hover, solid on select */}
            <div style={{
              position: 'absolute', inset: 0,
              outline:  isSelected ? '2px solid #3b82f6' : '2px dashed #93c5fd',
              outlineOffset: '-2px',
              borderRadius: 2,
              transition: 'outline 80ms',
            }} />

            {/* Label tab at top-left (like email editor "Section" tab) */}
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

            {/* Controls: grip + duplicate + delete — left side, pointer-events on */}
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
                {/* Drag grip */}
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

                {/* Duplicate */}
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

                {/* Delete */}
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

// ─── Variables sidebar (extracted live) ──────────────────────────────────────

function ExtractedVars({ editor }: { readonly editor: Editor | null }) {
  const [vars, setVars] = useState<string[]>([]);

  useEffect(() => {
    if (!editor) return;
    const update = () => setVars(extractVariablesFromTiptap(editor.getJSON()));
    editor.on('update', update);
    update();
    return () => { editor.off('update', update); };
  }, [editor]);

  if (vars.length === 0) return (
    <div className="flex items-center justify-center h-20">
      <p className="text-[11px] text-slate-400 text-center">Insérez des variables<br />dans le document</p>
    </div>
  );

  return (
    <div className="p-3 flex flex-wrap gap-1.5">
      {vars.map((name) => (
        <span
          key={name}
          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
        >
          {'{{' + name + '}}'}
        </span>
      ))}
    </div>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────

function RightPanel({
  contractType, onSwitchType, onReloadTemplate, editor,
}: {
  readonly contractType: ContractType;
  readonly onSwitchType: (t: ContractType) => void;
  readonly onReloadTemplate: () => void;
  readonly editor: Editor | null;
}) {
  return (
    <div className="w-56 border-l border-border bg-white flex flex-col overflow-hidden shrink-0">
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Document</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Contract type — clicking a different type loads its template */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Type de contrat</p>
          <div className="space-y-1">
            {(Object.keys(CONTRACT_TYPES) as ContractType[]).map((t) => (
              <button
                key={t}
                onClick={() => onSwitchType(t)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors border ${
                  contractType === t
                    ? CONTRACT_TYPES[t].color + ' font-semibold'
                    : 'text-slate-500 border-transparent hover:bg-slate-50'
                }`}
              >
                {CONTRACT_TYPES[t].label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic">
            Changer de type remplace le contenu par le modèle correspondant.
          </p>
        </div>

        {/* Reload current template */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Modèle</p>
          <button
            onClick={onReloadTemplate}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-500 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all"
          >
            <FileText size={12} /> Réinitialiser ce contrat
          </button>
        </div>

        {/* Extracted variables */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Variables détectées</p>
          <ExtractedVars editor={editor} />
        </div>
      </div>
    </div>
  );
}

// ─── Switch type confirmation modal ──────────────────────────────────────────

function SwitchTypeModal({
  fromType, toType, onConfirm, onClose,
}: {
  readonly fromType: ContractType;
  readonly toType: ContractType;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Changer de type de contrat ?</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Le contenu actuel sera remplacé par le modèle{' '}
            <span className="font-semibold text-slate-700">{CONTRACT_TYPES[toType].label}</span>.
            Cette action est irréversible.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <span className={`px-2 py-1 rounded-md text-[10px] font-medium border ${CONTRACT_TYPES[fromType].color}`}>
              {CONTRACT_TYPES[fromType].label}
            </span>
            <ArrowRightIcon />
            <span className={`px-2 py-1 rounded-md text-[10px] font-medium border ${CONTRACT_TYPES[toType].color}`}>
              {CONTRACT_TYPES[toType].label}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            <FileText size={13} /> Charger le modèle
          </button>
        </div>
      </div>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}

// ─── Variable labels (display name for each token) ───────────────────────────

function labelFor(name: string): string {
  const found = VARIABLE_PALETTE.flatMap((c) => c.vars).find((v) => v.name === name);
  return found?.label ?? name.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function categoryFor(name: string): { bg: string; color: string; border: string } {
  const cat = VARIABLE_PALETTE.find((c) => c.vars.some((v) => v.name === name));
  return cat ?? { bg: '#f1f5f9', color: '#334155', border: '#e2e8f0' };
}

// ─── Fill Variables Modal ─────────────────────────────────────────────────────

function FillVariablesModal({
  variables,
  onConfirm,
  onClose,
  isGenerating,
}: {
  readonly variables: string[];
  readonly onConfirm: (values: Record<string, string>) => void;
  readonly onClose: () => void;
  readonly isGenerating: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(variables.map((k) => [k, ''])),
  );

  const filled = variables.filter((k) => values[k]?.trim()).length;
  const total = variables.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  // Group variables by palette category
  const groups = VARIABLE_PALETTE.map((cat) => ({
    ...cat,
    active: cat.vars.filter((v) => variables.includes(v.name)),
  })).filter((g) => g.active.length > 0);

  // Variables not in any palette category
  const uncategorised = variables.filter(
    (name) => !VARIABLE_PALETTE.flatMap((c) => c.vars).some((v) => v.name === name),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Remplir les variables</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {total} variable{total !== 1 ? 's' : ''} dans ce document
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#6366f1' }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-500 shrink-0">
              {filled}/{total}
              {pct === 100 && <span className="ml-1 text-emerald-600">✓</span>}
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {total === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              Aucune variable dans ce document.<br />
              Le PDF sera généré tel quel.
            </p>
          )}

          {groups.map((cat) => (
            <div key={cat.label}>
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                >
                  {cat.label}
                </span>
              </div>
              <div className="space-y-2.5">
                {cat.active.map((v) => (
                  <div key={v.name}>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {v.label}
                      <span className="ml-1.5 font-mono text-[10px] text-slate-400">{'{{' + v.name + '}}'}</span>
                    </label>
                    <input
                      value={values[v.name] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [v.name]: e.target.value }))}
                      placeholder={`Valeur pour ${v.label}`}
                      className="w-full h-8 px-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {uncategorised.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Autres</span>
              </div>
              <div className="space-y-2.5">
                {uncategorised.map((name) => (
                  <div key={name}>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {labelFor(name)}
                      <span className="ml-1.5 font-mono text-[10px] text-slate-400">{'{{' + name + '}}'}</span>
                    </label>
                    <input
                      value={values[name] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                      placeholder={`Valeur pour ${name}`}
                      className="w-full h-8 px-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(values)}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isGenerating
              ? <><RefreshCw size={13} className="animate-spin" /> Génération…</>
              : <><CheckCircle2 size={13} /> Exporter le PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slash command menu ───────────────────────────────────────────────────────

function SlashMenu({
  query,
  coords,
  allVars,
  varLabels,
  onSelect,
  onClose,
}: {
  query: string;
  coords: { top: number; left: number };
  allVars: Record<string, string[]>;
  varLabels: Record<string, string>;
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);

  const items = useMemo<SlashMenuItem[]>(() => {
    const q = query.toLowerCase();
    const varItems: SlashMenuItem[] = Object.entries(allVars)
      .flatMap(([cat, names]) =>
        names
          .filter((n) => !q || n.includes(q) || (varLabels[n] ?? '').toLowerCase().includes(q) || cat.toLowerCase().includes(q))
          .slice(0, 4)
          .map((n) => ({
            type: 'variable' as const,
            key: `v:${n}`,
            name: n,
            label: varLabels[n] ?? n.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            category: cat,
          }))
      )
      .slice(0, 8);

    const blockItems: SlashMenuItem[] = BLOCK_LIBRARY
      .filter((b) => !q || b.label.toLowerCase().includes(q) || b.type.toLowerCase().includes(q))
      .slice(0, 4)
      .map((b) => ({
        type: 'block' as const,
        key: `b:${b.label}`,
        label: b.label,
        description: b.description,
        color: b.color,
        build: b.build,
      }));

    return [...varItems, ...blockItems];
  }, [query, allVars, varLabels]);

  useEffect(() => setIdx(0), [items]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[idx]) onSelect(items[idx]); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [items, idx, onSelect, onClose]);

  if (items.length === 0) return null;

  const varSectionItems = items.filter((i) => i.type === 'variable');
  const blockSectionItems = items.filter((i) => i.type === 'block');

  return (
    <div
      style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
      className="w-72 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
    >
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-500">Insérer…</span>
        <span className="text-[10px] text-slate-400 ml-auto">↑↓ Naviguer · ↵ Insérer · Esc Fermer</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {varSectionItems.length > 0 && (
          <>
            <div className="px-3 py-1 bg-slate-50 border-b border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Variables</span>
            </div>
            {varSectionItems.map((item) => {
              if (item.type !== 'variable') return null;
              const cat = VARIABLE_PALETTE.find((c) => c.label === item.category);
              const bg = cat?.bg ?? '#f1f5f9';
              const color = cat?.color ?? '#334155';
              const globalIdx = items.indexOf(item);
              return (
                <button
                  key={item.key}
                  onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
                  onMouseEnter={() => setIdx(globalIdx)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${globalIdx === idx ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: bg, color }}>
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.category}</span>
                </button>
              );
            })}
          </>
        )}
        {blockSectionItems.length > 0 && (
          <>
            <div className="px-3 py-1 bg-slate-50 border-b border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Blocs</span>
            </div>
            {blockSectionItems.map((item) => {
              if (item.type !== 'block') return null;
              const globalIdx = items.indexOf(item);
              return (
                <button
                  key={item.key}
                  onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
                  onMouseEnter={() => setIdx(globalIdx)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${globalIdx === idx ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-5 h-5 rounded shrink-0 ${item.color.split(' ')[0]}`} />
                  <div>
                    <div className="text-[11px] font-medium text-slate-800">{item.label}</div>
                    <div className="text-[9px] text-slate-400">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

function ContractEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const templateId = searchParams.get('id') || null;
  const name = searchParams.get('name') || 'Nouveau contrat';
  const description = searchParams.get('description') || '';
  const isEditMode = !!templateId;

  const [contractType, setContractType] = useState<ContractType>('b2c');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [version, setVersion] = useState(1);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showFillModal, setShowFillModal] = useState(false);
  const [modalVars, setModalVars] = useState<string[]>([]);
  const [pendingSwitch, setPendingSwitch] = useState<ContractType | null>(null);

  // ── Variable data (lifted from VariablePalette) ──
  const [allVars, setAllVars] = useState<Record<string, string[]>>({});
  const [customVarNames, setCustomVarNames] = useState<Set<string>>(new Set());

  const varLabels = useMemo<Record<string, string>>(() => {
    const labels: Record<string, string> = {};
    for (const cat of VARIABLE_PALETTE) {
      for (const v of cat.vars) labels[v.name] = v.label;
    }
    for (const names of Object.values(allVars)) {
      for (const name of names) {
        if (!labels[name]) labels[name] = name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
    return labels;
  }, [allVars]);

  useEffect(() => {
    if (!user?.tenant_id) return;
    contractVariables.get()
      .then((data) => {
        if (!data?.variables || Object.keys(data.variables).length === 0) {
          const fb: Record<string, string[]> = {};
          VARIABLE_PALETTE.forEach((c) => { fb[c.label] = c.vars.map((v) => v.name); });
          setAllVars(fb);
          setCustomVarNames(new Set());
        } else {
          setAllVars(data.variables);
          setCustomVarNames(new Set(data.customNames ?? []));
        }
      })
      .catch(() => {
        const fb: Record<string, string[]> = {};
        VARIABLE_PALETTE.forEach((c) => { fb[c.label] = c.vars.map((v) => v.name); });
        setAllVars(fb);
        setCustomVarNames(new Set());
      });
  }, [user?.tenant_id]);

  const handleAddVar = useCallback((catLabel: string, name: string) => {
    contractVariables.add({ category: catLabel, name }).catch(console.error);
    setAllVars((prev) => ({ ...prev, [catLabel]: [...(prev[catLabel] ?? []), name] }));
    setCustomVarNames((prev) => new Set([...prev, name]));
  }, []);

  const handleDeleteVar = useCallback((catLabel: string, name: string) => {
    contractVariables.remove(name).catch(console.error);
    setAllVars((prev) => ({ ...prev, [catLabel]: (prev[catLabel] ?? []).filter((n) => n !== name) }));
    setCustomVarNames((prev) => { const s = new Set(prev); s.delete(name); return s; });
  }, []);

  const handleImportCsv = useCallback((headers: string[]) => {
    const category = 'Données CSV';
    const names = headers.map((h) => h.trim().replace(/\s+/g, '_').toLowerCase()).filter(Boolean);
    const unique = [...new Set(names)];
    setAllVars((prev) => ({ ...prev, [category]: [...new Set([...(prev[category] ?? []), ...unique])] }));
    setCustomVarNames((prev) => new Set([...prev, ...unique]));
    unique.forEach((name) => contractVariables.add({ category, name }).catch(console.error));
    toast.success(`${unique.length} variable(s) importée(s) depuis CSV`);
  }, []);

  // ── Slash + validation state (no editor dep yet — declared here so hooks order is stable) ──
  const [slashMenu, setSlashMenu] = useState<{
    query: string; from: number; coords: { top: number; left: number };
  } | null>(null);
  const [usedVars, setUsedVars] = useState<string[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      VariableNode,
      ContractHeader,
      ...ALL_CONTRACT_BLOCKS,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Commencez à rédiger votre contrat…' }),
    ],
    content: CONTRACT_TEMPLATES.b2c,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[250mm]',
        spellcheck: 'false',
      },
    },
  });

  // Load existing template — fires once per templateId, after the editor mounts.
  // With immediatelyRender:false the editor is null on first render, so we must
  // include `editor` in deps; a ref guard prevents reload on later editor swaps.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!templateId || !editor) return;
    if (loadedFor.current === templateId) return;
    loadedFor.current = templateId;
    templates.get(templateId)
      .then((result: any) => {
        const tmpl = result?.template ?? result;
        try {
          const parsed = JSON.parse(tmpl?.content ?? '');
          if (parsed.contractType) setContractType(parsed.contractType as ContractType);
          if (parsed.version) setVersion(parsed.version);
          if (parsed.doc) editor.commands.setContent(parsed.doc);
        } catch { /* keep defaults */ }
      })
      .catch(() => toast.error('Erreur chargement du template'));
  }, [templateId, editor]);

  const loadTemplate = useCallback((type: ContractType) => {
    if (!editor) return;
    const tpl = CONTRACT_TEMPLATES[type];
    if (!tpl) return;
    editor.commands.setContent(tpl);
    setContractType(type);
  }, [editor]);

  // ── Slash command detection (after editor is declared) ──
  useEffect(() => {
    if (!editor) return;
    const detect = () => {
      const { $from } = editor.state.selection;
      const text = $from.parent.textBetween(0, $from.parentOffset);
      const match = text.match(/\/([^/\n]*)$/);
      if (match) {
        const from = $from.pos - match[0].length;
        try {
          const c = editor.view.coordsAtPos($from.pos);
          setSlashMenu({ query: match[1].toLowerCase(), from, coords: { top: c.bottom + 4, left: c.left } });
        } catch { setSlashMenu(null); }
      } else {
        setSlashMenu(null);
      }
    };
    editor.on('update', detect);
    editor.on('selectionUpdate', detect);
    return () => { editor.off('update', detect); editor.off('selectionUpdate', detect); };
  }, [editor]);

  const executeSlashItem = useCallback((item: SlashMenuItem) => {
    if (!editor || !slashMenu) return;
    const to = editor.state.selection.from;
    editor.chain().focus().deleteRange({ from: slashMenu.from, to }).run();
    if (item.type === 'variable') {
      editor.chain().focus().insertContent({ type: 'variable', attrs: { name: item.name, label: varLabels[item.name] ?? null } }).run();
    } else {
      editor.chain().focus().insertContent(item.build()).run();
    }
    setSlashMenu(null);
  }, [editor, slashMenu, varLabels]);

  // ── Variable validation (after editor is declared) ──
  useEffect(() => {
    if (!editor) return;
    const update = () => setUsedVars(extractVariablesFromTiptap(editor.getJSON() as Record<string, unknown>));
    editor.on('update', update);
    update();
    return () => editor.off('update', update);
  }, [editor]);

  const allKnownVarNames = useMemo(() => new Set(Object.values(allVars).flat()), [allVars]);
  const undefinedVars = useMemo(() => usedVars.filter((v) => !allKnownVarNames.has(v)), [usedVars, allKnownVarNames]);

  // Request type change — opens confirmation modal
  const requestSwitch = useCallback((type: ContractType) => {
    if (type === contractType) return;
    setPendingSwitch(type);
  }, [contractType]);

  // Confirm pending switch — actually load the template
  const confirmSwitch = useCallback(() => {
    if (!pendingSwitch) return;
    loadTemplate(pendingSwitch);
    setPendingSwitch(null);
    toast.success(`Modèle ${CONTRACT_TYPES[pendingSwitch].label} chargé`);
  }, [pendingSwitch, loadTemplate]);

  // Reload current template (no confirmation needed if same type)
  const reloadCurrent = useCallback(() => {
    if (!editor) return;
    if (window.confirm('Réinitialiser le contrat avec le modèle par défaut ? Le contenu actuel sera perdu.')) {
      loadTemplate(contractType);
      toast.success('Modèle réinitialisé');
    }
  }, [editor, contractType, loadTemplate]);

  // ── Save the TEMPLATE (no filled values — variables stay as {{name}} tokens) ──

  const persistTemplate = useCallback(async (): Promise<boolean> => {
    if (!editor) return false;
    const newVersion = version + 1;
    const content = JSON.stringify({
      contractType,
      version: newVersion,
      doc: editor.getJSON(), // template — variable nodes preserved, not substituted
    });
    try {
      if (isEditMode && templateId) {
        await templates.update(templateId, { name, description, type: 3, content });
      } else {
        await templates.create({ name, description, type: 3, content });
      }
      setVersion(newVersion);
      return true;
    } catch {
      return false;
    }
  }, [editor, version, contractType, isEditMode, templateId, name, description]);

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await persistTemplate();
    setIsSaving(false);
    if (ok) {
      toast.success(isEditMode ? 'Contrat mis à jour' : 'Contrat enregistré');
      router.push('/dashboard/templates');
    } else {
      toast.error("Échec de l'enregistrement");
    }
  };

  // ── Generate PDF — step 1: open fill modal ──

  const handleGenerate = useCallback(() => {
    if (!editor) return;
    const vars = extractVariablesFromTiptap(editor.getJSON() as Record<string, unknown>);
    setModalVars(vars);
    setShowFillModal(true);
  }, [editor]);

  // ── Generate PDF — step 2: export PDF with filled values, then save the
  //    template (with placeholders, NOT the filled values) and redirect.
  //    The filled values are only used for the PDF output; the saved template
  //    keeps {{variable}} tokens so it can be reused with different values.

  const confirmGenerate = useCallback(async (values: Record<string, string>) => {
    if (!editor) return;
    setIsGenerating(true);
    const toastId = toast.loading('Génération du PDF…');
    const html = renderTiptapToHtml(editor.getJSON() as Record<string, unknown>, values);
    try {
      const res = await fetch('http://localhost:3000/templates/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ html, name }),
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${name}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé', { id: toastId });

      // Save the template with placeholders (filled values are discarded).
      toast.loading('Enregistrement du template…', { id: toastId });
      const saved = await persistTemplate();
      if (saved) {
        toast.success(isEditMode ? 'Template mis à jour' : 'Template enregistré', { id: toastId });
        setShowFillModal(false);
        router.push('/dashboard/templates');
      } else {
        toast.error("PDF généré, mais l'enregistrement du template a échoué", { id: toastId });
      }
    } catch {
      toast.error('Erreur génération PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [editor, name, persistTemplate, isEditMode, router]);

  const typeConfig = CONTRACT_TYPES[contractType];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" onClick={() => setShowTypeMenu(false)}>

      {/* ── Toolbar ── */}
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} /> Retour
          </button>
          <div className="w-px h-4 bg-border" />
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowTypeMenu((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${typeConfig.color}`}
            >
              {typeConfig.label} <ChevronDown size={11} />
            </button>
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                {(Object.keys(CONTRACT_TYPES) as ContractType[]).map((t) => (
                  <button key={t} onClick={() => { requestSwitch(t); setShowTypeMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-50 ${contractType === t ? 'font-semibold' : 'text-muted-foreground'}`}>
                    {CONTRACT_TYPES[t].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">v{version}</span>
        </div>

        <span className="text-sm font-medium text-foreground/80 truncate max-w-xs">{name}</span>

        <div className="flex items-center gap-2">
          {undefinedVars.length > 0 && (
            <div
              title={`Variables inconnues : ${undefinedVars.join(', ')}`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium cursor-default"
            >
              <AlertTriangle size={11} />
              <span>⚠ {undefinedVars.length} variable{undefinedVars.length > 1 ? 's' : ''} non définie{undefinedVars.length > 1 ? 's' : ''}</span>
            </div>
          )}
          <button onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50">
            <Save size={13} /> {isSaving ? 'Enregistrement…' : isEditMode ? 'Mettre à jour' : 'Enregistrer'}
          </button>
          <button onClick={handleGenerate} disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40">
            {isGenerating
              ? <><RefreshCw size={13} className="animate-spin" /> Génération…</>
              : <><Download size={13} /> Générer PDF</>}
          </button>
        </div>
      </div>

      {/* ── Formatting toolbar ── */}
      <EditorToolbar editor={editor} />

      {/* ── 3-panel body ── */}
      <VarLabelsContext.Provider value={varLabels}>
      <div className="flex flex-1 overflow-hidden" onClick={() => setSlashMenu(null)}>
        <VariablePalette
          editor={editor}
          allVars={allVars}
          customVarNames={customVarNames}
          varLabels={varLabels}
          onAddVar={handleAddVar}
          onDeleteVar={handleDeleteVar}
          onImportCsv={handleImportCsv}
        />
        <ContractCanvas editor={editor} />
        <RightPanel
          contractType={contractType}
          onSwitchType={requestSwitch}
          onReloadTemplate={reloadCurrent}
          editor={editor}
        />
      </div>
      </VarLabelsContext.Provider>

      {/* ── Slash command menu ── */}
      {slashMenu && (
        <SlashMenu
          query={slashMenu.query}
          coords={slashMenu.coords}
          allVars={allVars}
          varLabels={varLabels}
          onSelect={executeSlashItem}
          onClose={() => setSlashMenu(null)}
        />
      )}

      {/* ── Switch type confirmation modal ── */}
      {pendingSwitch && (
        <SwitchTypeModal
          fromType={contractType}
          toType={pendingSwitch}
          onConfirm={confirmSwitch}
          onClose={() => setPendingSwitch(null)}
        />
      )}

      {/* ── Fill variables modal ── */}
      {showFillModal && (
        <FillVariablesModal
          variables={modalVars}
          onConfirm={confirmGenerate}
          onClose={() => setShowFillModal(false)}
          isGenerating={isGenerating}
        />
      )}

      {/* ── Editor styles ── */}
      <style>{`
        .contract-canvas .tiptap {
          min-height: 250mm;
          outline: none;
        }
        .contract-canvas .tiptap h1 {
          font-size: 14pt; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.5px; margin: 0 0 16px; color: #0f172a;
        }
        .contract-canvas .tiptap h2 {
          font-size: 11pt; font-weight: 700; margin: 20px 0 8px; color: #0f172a;
        }
        .contract-canvas .tiptap h3 {
          font-size: 10.5pt; font-weight: 600; margin: 14px 0 6px; color: #1e293b;
        }
        .contract-canvas .tiptap p {
          font-size: 10pt; line-height: 1.75; margin: 0 0 8px;
        }
        .contract-canvas .tiptap p[style*="text-align: justify"],
        .contract-canvas .tiptap [style*="text-align: justify"] {
          text-align: justify; hyphens: auto;
        }
        .contract-canvas .tiptap ul, .contract-canvas .tiptap ol {
          padding-left: 20px; margin: 4px 0 10px;
        }
        .contract-canvas .tiptap li { line-height: 1.75; margin-bottom: 2px; }
        .contract-canvas .tiptap blockquote {
          border-left: 3px solid #0f172a; padding: 6px 14px;
          margin: 10px 0; background: #f8fafc;
        }
        .contract-canvas .tiptap hr {
          border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;
        }
        .contract-canvas .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left; color: #adb5bd; pointer-events: none; height: 0;
        }
        /* Highlight variable pills as drop targets while dragging from sidebar */
        .dragging-variable .contract-canvas [data-variable] {
          outline: 2px dashed #f59e0b;
          outline-offset: 2px;
          cursor: copy;
        }
        .dragging-variable .contract-canvas [data-variable]:hover {
          outline: 2px solid #f59e0b;
          background: #fef3c7 !important;
          color: #92400e !important;
        }
      `}</style>
    </div>
  );
}

export default function ContractEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ContractEditorContent />
    </Suspense>
  );
}
