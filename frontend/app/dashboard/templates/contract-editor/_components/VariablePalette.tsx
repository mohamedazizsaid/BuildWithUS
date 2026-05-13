'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronDown, Plus, Minus, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { VARIABLE_PALETTE } from '@/lib/tiptap/contract-templates';
import { BLOCK_LIBRARY } from '../_lib/block-library';
import { parseCsv, slugifyHeader } from '../_lib/csv';
import type { CsvDataset } from '../_lib/types';

interface VariablePaletteProps {
  editor: Editor | null;
  allVars: Record<string, string[]>;
  customVarNames: Set<string>;
  varLabels: Record<string, string>;
  csvDatasets: CsvDataset[];
  onAddVar: (category: string, name: string) => void;
  onDeleteVar: (category: string, name: string) => void;
  onImportCsv: (filename: string, headers: string[], rows: Record<string, string>[]) => void;
  onRemoveCsv: (filename: string) => void;
}

export function VariablePalette({ editor, allVars, customVarNames, varLabels, csvDatasets, onAddVar, onDeleteVar, onImportCsv, onRemoveCsv }: VariablePaletteProps) {
  const [tab, setTab] = useState<'vars' | 'blocs' | 'csv'>('vars');
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
    const { selection } = editor.state;
    const $to = selection.$to;
    let insertPos: number;
    try {
      insertPos = $to.depth >= 1 ? $to.after(1) : selection.to;
    } catch {
      insertPos = selection.to;
    }
    editor.chain().focus().insertContentAt(insertPos, build()).run();
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
    const filename = file.name;
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const isSpreadsheet = ['xlsx', 'xls', 'ods'].includes(ext);

    if (isSpreadsheet) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const XLSX = await import('xlsx');
          const buffer = ev.target?.result as ArrayBuffer;
          const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });
          if (!data.length) return;
          const rawHeaders = (data[0] as (string | number)[]).map(String);
          const headers = rawHeaders.map(slugifyHeader).filter(Boolean);
          const rows = data.slice(1).map((row) => {
            const r: Record<string, string> = {};
            headers.forEach((h, i) => { r[h] = String((row as (string | number)[])[i] ?? '').trim(); });
            return r;
          }).filter((row) => Object.values(row).some((v) => v));
          if (headers.length > 0) { onImportCsv(filename, headers, rows); setTab('csv'); }
        } catch (err) {
          console.error('[CSV import] Failed to parse spreadsheet:', err);
          toast.error('Erreur lecture fichier — vérifiez le format');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const { headers, rows } = parseCsv(text);
        if (headers.length > 0) { onImportCsv(filename, headers, rows); setTab('csv'); }
        else { toast.error('Aucune colonne détectée — vérifiez le séparateur'); }
      };
      reader.readAsText(file, 'UTF-8');
    }
    e.target.value = '';
  }, [onImportCsv]);

  const displayCategories = Object.keys(allVars)
    .filter((label) => label.toLowerCase() !== 'données csv' && label.toLowerCase() !== 'donnees csv')
    .map((label) => {
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
      <div className="flex border-b border-border bg-white shrink-0">
        <button onClick={() => setTab('vars')} className={`flex-1 px-2 py-2.5 text-[10px] font-semibold transition-colors ${tab === 'vars' ? 'text-slate-900 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600'}`}>
          Variables
        </button>
        <button onClick={() => setTab('blocs')} className={`flex-1 px-2 py-2.5 text-[10px] font-semibold transition-colors ${tab === 'blocs' ? 'text-slate-900 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600'}`}>
          Blocs
        </button>
        <button onClick={() => setTab('csv')} className={`flex-1 px-2 py-2.5 text-[10px] font-semibold transition-colors relative ${tab === 'csv' ? 'text-slate-900 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}>
          CSV
          {csvDatasets.length > 0 && (
            <span className="absolute top-1.5 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[8px] font-bold flex items-center justify-center">
              {csvDatasets.length}
            </span>
          )}
        </button>
      </div>

      <input ref={csvInputRef} type="file" accept=".csv,.xlsx,.xls,.ods,.tsv,.txt" className="hidden" onChange={handleCsvFile} />

      {tab === 'vars' && (
        <>
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] text-slate-400">Glissez ou cliquez pour insérer</p>
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
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0" style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>
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
              <button key={`${b.type}-${i}`} onClick={() => insertBlock(b.build)} className={`w-full text-left p-2.5 rounded-lg border transition-all hover:shadow-sm ${b.color}`}>
                <div className="text-[11px] font-semibold">{b.label}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{b.description}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'csv' && (
        <>
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <p className="text-[10px] text-slate-400">{csvDatasets.length === 0 ? 'Aucun CSV importé' : `${csvDatasets.length} fichier(s)`}</p>
            <button
              onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors"
            >
              <Upload size={9} /> Importer
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {csvDatasets.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Upload size={20} className="text-slate-300" />
                <p className="text-[10px] text-slate-400">Importez un fichier CSV<br />pour voir ses colonnes ici</p>
                <button
                  onClick={() => csvInputRef.current?.click()}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold hover:bg-emerald-100 transition-colors"
                >
                  Choisir un CSV
                </button>
              </div>
            ) : (
              csvDatasets.map((ds) => (
                <div key={ds.filename} className="rounded-lg border border-emerald-200 bg-white overflow-hidden">
                  <div className="px-2.5 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded shrink-0">CSV</span>
                    <span className="text-[10px] font-semibold text-emerald-800 truncate flex-1" title={ds.filename}>
                      {ds.filename.replace(/\.csv$/i, '')}
                    </span>
                    <span className="text-[9px] text-emerald-500 shrink-0">{ds.rows.length} lignes</span>
                    <button
                      onClick={() => onRemoveCsv(ds.filename)}
                      title={`Supprimer "${ds.filename}" et retirer ses variables du document`}
                      className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-emerald-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {ds.headers.map((name) => (
                      <div
                        key={name}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('variable-name', name);
                          e.dataTransfer.setData('variable-label', varLabels[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
                          e.dataTransfer.effectAllowed = 'copy';
                          document.body.classList.add('dragging-variable');
                        }}
                        onDragEnd={() => document.body.classList.remove('dragging-variable')}
                        onClick={() => insertVariable(name)}
                        className="w-full flex items-center px-2 py-1.5 rounded-md hover:bg-emerald-50 transition-all cursor-grab"
                      >
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
