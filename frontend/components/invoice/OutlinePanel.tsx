'use client';

import { useRef, useState } from 'react';
import { Eye, EyeOff, GripVertical, Lock, ChevronDown, Plus, Minus, Stamp, Upload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Invoice, BlockId } from '@/lib/invoice/types';
import { ESSENTIAL_BLOCKS } from '@/lib/invoice/types';
import { media } from '@/lib/api';
import { BLOCK_LABELS } from './blocks';
import type { Dispatch } from './blocks';
import { extractInvoiceVariables, INVOICE_VARIABLE_CATEGORIES } from '@/lib/invoice/variables';
import { VARIABLE_PALETTE } from '@/lib/tiptap/contract-templates';

/** Drag-and-drop MIME type that the canvas listens for to know a stamp is being dropped. */
export const STAMP_DRAG_TYPE = 'application/x-invoice-stamp';

// Combined lookup for chip colors: contract-side palette + invoice-block
// categories. Custom user categories that match neither fall back to slate.
const COMBINED_PALETTE_STYLES: Record<string, { bg: string; color: string; border: string }> = {};
for (const c of VARIABLE_PALETTE) {
  COMBINED_PALETTE_STYLES[c.label] = { bg: c.bg, color: c.color, border: c.border };
}
for (const c of INVOICE_VARIABLE_CATEGORIES) {
  COMBINED_PALETTE_STYLES[c.label] = { bg: c.bg, color: c.color, border: c.border };
}

interface Props {
  invoice: Invoice;
  selectedBlock: string | null;
  onSelectBlock: (id: string) => void;
  dispatch: Dispatch;
  allVars: Record<string, string[]>;
  customVarNames: Set<string>;
  varLabels: Record<string, string>;
  onAddVar: (category: string, name: string) => void;
  onDeleteVar: (category: string, name: string) => void;
}

type Tab = 'structure' | 'vars';

export function OutlinePanel(props: Props) {
  const [tab, setTab] = useState<Tab>('structure');

  return (
    <div className="w-60 border-r border-border bg-slate-50/50 flex flex-col overflow-hidden shrink-0">
      <div className="flex border-b border-border bg-white shrink-0">
        <button
          onClick={() => setTab('structure')}
          className={`flex-1 px-2 py-2.5 text-[10px] font-semibold transition-colors ${tab === 'structure' ? 'text-slate-900 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Structure
        </button>
        <button
          onClick={() => setTab('vars')}
          className={`flex-1 px-2 py-2.5 text-[10px] font-semibold transition-colors ${tab === 'vars' ? 'text-slate-900 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Variables
        </button>
      </div>

      {tab === 'structure' ? <StructureTab {...props} /> : <VariablesTab {...props} />}
    </div>
  );
}

// ─── Structure tab ─────────────────────────────────────────────────────────

function StructureTab({ invoice, selectedBlock, onSelectBlock, dispatch }: Props) {
  const [dragId, setDragId] = useState<BlockId | null>(null);
  const [overId, setOverId] = useState<BlockId | null>(null);

  const handleDrop = (target: BlockId) => {
    if (!dragId || dragId === target) {
      setDragId(null); setOverId(null);
      return;
    }
    const order = [...invoice.layout.blockOrder];
    const from = order.indexOf(dragId);
    const to   = order.indexOf(target);
    if (from === -1 || to === -1) return;
    order.splice(from, 1);
    order.splice(to, 0, dragId);
    dispatch({ type: 'layout/reorder', order });
    setDragId(null); setOverId(null);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {invoice.layout.blockOrder.map((id) => {
          const visible = invoice.layout.blockVisibility[id];
          const essential = ESSENTIAL_BLOCKS.includes(id);
          const selected = selectedBlock === id;
          const isOver = overId === id && dragId !== id;

          return (
            <div
              key={id}
              draggable
              onDragStart={() => setDragId(id)}
              onDragOver={(e) => { e.preventDefault(); setOverId(id); }}
              onDragLeave={() => setOverId(null)}
              onDrop={() => handleDrop(id)}
              onClick={() => onSelectBlock(id)}
              className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-[12px] transition-all ${
                selected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-white text-slate-600'
              } ${!visible ? 'opacity-50' : ''} ${isOver ? 'border-t-2 border-indigo-400' : ''}`}
            >
              <GripVertical size={11} className="text-slate-300 cursor-grab" />
              <span className="flex-1 truncate font-medium">{BLOCK_LABELS[id]}</span>
              <button
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'layout/toggleBlock', id }); }}
                disabled={essential}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                title={essential ? 'Bloc obligatoire' : visible ? 'Masquer' : 'Afficher'}
              >
                {essential ? <Lock size={11} className="text-slate-400" />
                : visible    ? <Eye size={11} className="text-slate-500" />
                             : <EyeOff size={11} className="text-slate-400" />}
              </button>
            </div>
          );
        })}

        <StampSection invoice={invoice} dispatch={dispatch} />
      </div>
      <div className="px-3 py-2 border-t border-border text-[10px] text-slate-400 leading-relaxed bg-white">
        Glissez pour réordonner. Les blocs <span className="font-semibold">Lignes</span> et <span className="font-semibold">Totaux</span> sont obligatoires.
      </div>
    </>
  );
}

// ─── Tampon (stamp) section ────────────────────────────────────────────────
// Lives at the bottom of the structure list. Unlike blocks, the stamp is
// free-positioned: the user drags its thumbnail onto the canvas to drop it
// anywhere, then drags the placed stamp itself to reposition.

function StampSection({ invoice, dispatch }: { invoice: Invoice; dispatch: Dispatch }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const stamp = invoice.data.stamp;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await media.upload(file);
      dispatch({ type: 'stamp/setImage', url });
      toast.success('Tampon prêt — glissez-le sur la facture');
    } catch {
      toast.error('Échec du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <div className="px-2 mb-1.5 flex items-center gap-1.5">
        <Stamp size={11} className="text-slate-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tampon</span>
      </div>

      {!stamp ? (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-3 rounded-md border border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/30 text-[11px] text-slate-500 hover:text-indigo-600 transition-all disabled:opacity-50"
          title="Ajouter une image de tampon ou de signature"
        >
          <Upload size={11} />
          {uploading ? 'Téléchargement…' : 'Ajouter un tampon'}
        </button>
      ) : (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(STAMP_DRAG_TYPE, '1');
            // Some browsers require a text fallback on the dataTransfer payload
            // before the drag is recognised as carrying data.
            e.dataTransfer.setData('text/plain', 'stamp');
            e.dataTransfer.effectAllowed = 'copyMove';
          }}
          className="group relative flex items-center gap-2 p-2 rounded-md border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
          title="Glissez sur la facture pour placer le tampon"
        >
          <img
            src={stamp.url}
            alt="Tampon"
            className="w-10 h-10 object-contain rounded bg-slate-50 shrink-0 pointer-events-none"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-slate-700 truncate">Tampon</div>
            <div className="text-[9px] text-slate-400">Glisser sur la facture</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'stamp/remove' }); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
            title="Supprimer le tampon"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ─── Variables tab ─────────────────────────────────────────────────────────

function VariablesTab({ invoice, allVars, customVarNames, varLabels, onAddVar, onDeleteVar }: Props) {
  const [open, setOpen] = useState<string | null>('Prestataire');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newVarName, setNewVarName] = useState('');

  const usedVars = extractInvoiceVariables(invoice);

  const categories = Object.keys(allVars).map((label) => {
    const style = COMBINED_PALETTE_STYLES[label];
    return {
      label,
      bg:     style?.bg     ?? '#f1f5f9',
      color:  style?.color  ?? '#334155',
      border: style?.border ?? '#e2e8f0',
      vars:   allVars[label] ?? [],
    };
  });

  const commitNewVar = (catLabel: string) => {
    const name = newVarName.trim().replace(/\s+/g, '_');
    if (!name) { setAddingTo(null); setNewVarName(''); return; }
    onAddVar(catLabel, name);
    setOpen(catLabel);
    setAddingTo(null);
    setNewVarName('');
  };

  return (
    <>
      <div className="px-3 py-2 border-b border-border bg-white">
        <p className="text-[10px] text-slate-400">Glissez une variable dans un champ pour insérer <span className="font-mono">{'{{token}}'}</span></p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {categories.map((cat) => (
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
                  <VarChip
                    key={name}
                    name={name}
                    label={varLabels[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    bg={cat.bg} color={cat.color} border={cat.border}
                    used={usedVars.includes(name)}
                    removable={customVarNames.has(name)}
                    onRemove={() => onDeleteVar(cat.label, name)}
                  />
                ))}
                {addingTo === cat.label && (
                  <div className="px-2 py-1">
                    <input
                      autoFocus
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

      <UsedVarsFooter used={usedVars} />
    </>
  );
}

function VarChip({ name, label, bg, color, border, used, removable, onRemove }: {
  name: string;
  label: string;
  bg: string; color: string; border: string;
  used: boolean;
  removable: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('variable-name', name);
        e.dataTransfer.effectAllowed = 'copy';
        document.body.classList.add('dragging-variable');
      }}
      onDragEnd={() => document.body.classList.remove('dragging-variable')}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-grab group"
      title={`Glissez-déposez {{${name}}} dans un champ de la facture`}
    >
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0"
          style={{ background: bg, color, border: `1px solid ${border}` }}
        >
          {label}
        </span>
        {used && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Utilisée dans la facture" />}
      </div>
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
          title="Supprimer"
        >
          <Minus size={9} />
        </button>
      )}
    </div>
  );
}

function UsedVarsFooter({ used }: { used: string[] }) {
  return (
    <div className="px-3 py-2 border-t border-border text-[10px] text-slate-400 leading-relaxed bg-white">
      {used.length === 0
        ? 'Aucune variable utilisée. Glissez-en une dans un champ de la facture.'
        : <><span className="font-semibold text-emerald-600">{used.length}</span> variable{used.length > 1 ? 's' : ''} utilisée{used.length > 1 ? 's' : ''} dans cette facture.</>}
    </div>
  );
}
