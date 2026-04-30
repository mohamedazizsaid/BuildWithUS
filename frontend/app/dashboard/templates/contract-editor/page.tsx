'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  ArrowLeft, Save, Download, RefreshCw, ChevronDown,
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Minus, Undo, Redo, FileText, X, CheckCircle2,
} from 'lucide-react';
import { templates } from '@/lib/api';
import { VariableNode, extractVariablesFromTiptap, renderTiptapToHtml } from '@/lib/tiptap/variable-node';
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

// ─── Variable Palette ─────────────────────────────────────────────────────────

function VariablePalette({ editor }: { readonly editor: Editor | null }) {
  const [open, setOpen] = useState<string | null>('Prestataire');

  const insertVariable = useCallback((name: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent({ type: 'variable', attrs: { name } }).run();
  }, [editor]);

  return (
    <div className="w-52 border-r border-border bg-slate-50 flex flex-col overflow-hidden shrink-0">
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Variables</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Glissez ou cliquez</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {VARIABLE_PALETTE.map((cat) => (
          <div key={cat.label}>
            <button
              onClick={() => setOpen(open === cat.label ? null : cat.label)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className="text-[11px] font-semibold text-slate-500">{cat.label}</span>
              <ChevronDown size={11} className={`text-slate-400 transition-transform ${open === cat.label ? 'rotate-180' : ''}`} />
            </button>
            {open === cat.label && (
              <div className="space-y-0.5 pl-1 mb-1">
                {cat.vars.map((v) => (
                  <div
                    key={v.name}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('variable-name', v.name);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => insertVariable(v.name)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-grab group"
                  >
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono shrink-0"
                      style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                    >
                      {'{{' + v.name + '}}'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
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

// ─── A4 Canvas ────────────────────────────────────────────────────────────────

function ContractCanvas({ editor }: { readonly editor: Editor | null }) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const varName = e.dataTransfer.getData('variable-name');
    if (!varName || !editor) return;
    const view = editor.view;
    const pos = view.posAtCoords({ left: e.clientX, top: e.clientY });
    if (!pos) return;
    const node = view.state.schema.nodes.variable?.create({ name: varName });
    if (!node) return;
    const tr = view.state.tr.insert(pos.pos, node);
    view.dispatch(tr);
  }, [editor]);

  return (
    <div
      className="flex-1 overflow-y-auto bg-slate-100 p-8"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div
        ref={canvasRef}
        className="bg-white shadow-sm mx-auto contract-canvas"
        style={{
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

// ─── Main editor ──────────────────────────────────────────────────────────────

function ContractEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      VariableNode,
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

  // Load existing template
  useEffect(() => {
    if (!templateId || !editor) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const loadTemplate = useCallback((type: ContractType) => {
    if (!editor) return;
    const tpl = CONTRACT_TEMPLATES[type];
    if (!tpl) return;
    editor.commands.setContent(tpl);
    setContractType(type);
  }, [editor]);

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

  // ── Save ──

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    const newVersion = version + 1;
    const content = JSON.stringify({
      contractType,
      version: newVersion,
      doc: editor.getJSON(),
    });
    try {
      if (isEditMode && templateId) {
        await templates.update(templateId, { name, description, type: 3, content });
      } else {
        await templates.create({ name, description, type: 3, content });
      }
      setVersion(newVersion);
      toast.success(isEditMode ? 'Contrat mis à jour' : 'Contrat enregistré');
      router.push('/dashboard/templates');
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Generate PDF — step 1: open fill modal ──

  const handleGenerate = useCallback(() => {
    if (!editor) return;
    const vars = extractVariablesFromTiptap(editor.getJSON() as Record<string, unknown>);
    setModalVars(vars);
    setShowFillModal(true);
  }, [editor]);

  // ── Generate PDF — step 2: export with filled values ──

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
      setShowFillModal(false);
    } catch {
      toast.error('Erreur génération PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [editor, name]);

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
      <div className="flex flex-1 overflow-hidden">
        <VariablePalette editor={editor} />
        <ContractCanvas editor={editor} />
        <RightPanel
          contractType={contractType}
          onSwitchType={requestSwitch}
          onReloadTemplate={reloadCurrent}
          editor={editor}
        />
      </div>

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
