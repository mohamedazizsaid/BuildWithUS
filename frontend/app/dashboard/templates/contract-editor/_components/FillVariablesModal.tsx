'use client';

import { useState } from 'react';
import { X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { VARIABLE_PALETTE } from '@/lib/tiptap/contract-templates';
import { labelFor } from '../_lib/blocks';

export function FillVariablesModal({
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

  const groups = VARIABLE_PALETTE.map((cat) => ({
    ...cat,
    active: cat.vars.filter((v) => variables.includes(v.name)),
  })).filter((g) => g.active.length > 0);

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
