'use client';

import { motion } from 'framer-motion';
import { X, Sparkles, Check, AlertTriangle, ArrowRight, FileSpreadsheet, FileText, Wand2 } from 'lucide-react';
import type { MappingSource } from '@/lib/variable-mapper';

interface Props {
  templateVars: string[];
  fileHeaders: string[];
  mapping: Record<string, string | null>;
  sources: Record<string, MappingSource>;
  sampleRow?: Record<string, string>;
  rowCount: number;
  filename: string;
  isGenerating: boolean;
  title?: string;
  confirmLabel?: string;
  onChange: (templateVar: string, fileCol: string | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const SOURCE_STYLES: Record<MappingSource, {
  label: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
  Icon: typeof Check;
}> = {
  exact: {
    label: 'Automatique',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeColor: 'text-emerald-700',
    borderColor: 'border-l-emerald-400',
    Icon: Check,
  },
  ai: {
    label: 'Suggéré par IA',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeColor: 'text-indigo-700',
    borderColor: 'border-l-indigo-400',
    Icon: Sparkles,
  },
  none: {
    label: 'À assigner',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeColor: 'text-amber-700',
    borderColor: 'border-l-amber-400',
    Icon: AlertTriangle,
  },
};

function humanLabel(v: string): string {
  return v.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

export function MappingConfirmModal({
  templateVars,
  fileHeaders,
  mapping,
  sources,
  sampleRow,
  rowCount,
  filename,
  isGenerating,
  title = 'Correspondance détectée',
  confirmLabel,
  onChange,
  onConfirm,
  onCancel,
}: Props) {
  const stats = {
    exact: templateVars.filter((v) => sources[v] === 'exact').length,
    ai: templateVars.filter((v) => sources[v] === 'ai').length,
    none: templateVars.filter((v) => sources[v] === 'none' || !mapping[v]).length,
  };
  const total = templateVars.length;
  const resolved = stats.exact + stats.ai;
  const progress = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[760px] max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="relative px-6 pt-5 pb-4 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 border-b border-slate-100">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/80 transition-colors"
          >
            <X size={16} className="text-slate-500" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-200">
                <Wand2 size={18} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="text-[12px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <FileSpreadsheet size={11} />
                <span className="font-medium text-slate-600">{filename}</span>
                <span className="text-slate-300">·</span>
                <span>{rowCount} ligne{rowCount > 1 ? 's' : ''}</span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-medium text-slate-600">
                {resolved}/{total} variable{total > 1 ? 's' : ''} associée{resolved > 1 ? 's' : ''}
              </span>
              <span className="font-semibold text-slate-700">{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(stats.exact / Math.max(total, 1)) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-emerald-400"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(stats.ai / Math.max(total, 1)) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                className="h-full bg-indigo-400"
              />
            </div>
          </div>

          {/* Stat pills */}
          <div className="flex items-center gap-2">
            {stats.exact > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
                <Check size={11} strokeWidth={2.5} />
                {stats.exact} automatique{stats.exact > 1 ? 's' : ''}
              </div>
            )}
            {stats.ai > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-medium text-indigo-700">
                <Sparkles size={11} />
                {stats.ai} par IA
              </div>
            )}
            {stats.none > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700">
                <AlertTriangle size={11} />
                {stats.none} à vérifier
              </div>
            )}
          </div>
        </div>

        {/* ── Body — mapping list ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50/40">
          <div className="space-y-2">
            {templateVars.map((v, idx) => {
              const source: MappingSource = mapping[v] ? sources[v] ?? 'none' : 'none';
              const style = SOURCE_STYLES[source];
              const Icon = style.Icon;
              const fileCol = mapping[v];
              const sampleValue = fileCol && sampleRow ? sampleRow[fileCol] : '';

              return (
                <motion.div
                  key={v}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.025, duration: 0.2 }}
                  className={`group bg-white rounded-xl border border-slate-200 border-l-4 ${style.borderColor} p-3 hover:shadow-md hover:border-slate-300 transition-all`}
                >
                  <div className="grid grid-cols-[1fr,auto,1.2fr,auto] items-center gap-3">
                    {/* Template variable */}
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Variable du template
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-slate-400 shrink-0" />
                        <span className="font-mono text-[12px] font-medium text-slate-800 truncate">
                          {`{{${v}}}`}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {humanLabel(v)}
                      </div>
                    </div>

                    <ArrowRight size={15} className="text-slate-300 shrink-0" />

                    {/* File column dropdown + sample preview */}
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Colonne du fichier
                      </div>
                      <select
                        value={fileCol ?? ''}
                        onChange={(e) => onChange(v, e.target.value || null)}
                        className={`w-full h-8 px-2.5 text-[12px] font-medium rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all ${
                          fileCol ? 'border-slate-200 text-slate-800' : 'border-amber-200 text-amber-700 bg-amber-50/50'
                        }`}
                      >
                        <option value="">— non assigné —</option>
                        {fileHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      {sampleValue && (
                        <div className="text-[10px] text-slate-500 truncate mt-1 italic" title={sampleValue}>
                          ex: <span className="text-slate-700 font-medium not-italic">{sampleValue}</span>
                        </div>
                      )}
                      {!sampleValue && fileCol && (
                        <div className="text-[10px] text-slate-400 truncate mt-1 italic">
                          (valeur vide dans la 1ʳᵉ ligne)
                        </div>
                      )}
                      {!fileCol && (
                        <div className="text-[10px] text-amber-600 truncate mt-1">
                          Sera vide dans le PDF
                        </div>
                      )}
                    </div>

                    {/* Source badge */}
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium shrink-0 ${style.badgeBg} ${style.badgeColor}`}
                    >
                      <Icon size={10} strokeWidth={2.5} />
                      {style.label}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 bg-white">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            {stats.none > 0 ? (
              <>
                <AlertTriangle size={12} className="text-amber-500" />
                <span>
                  {stats.none} variable{stats.none > 1 ? 's' : ''} resteront vides — vous pouvez les assigner ci-dessus
                </span>
              </>
            ) : (
              <>
                <Check size={12} className="text-emerald-500" />
                <span>Toutes les variables sont prêtes à être remplies</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onCancel}
              disabled={isGenerating}
              className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isGenerating}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white text-xs font-semibold hover:from-slate-800 hover:to-slate-700 shadow-md shadow-slate-200 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isGenerating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  {confirmLabel ?? `Enregistrer le mapping (${rowCount} ligne${rowCount > 1 ? 's' : ''})`}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
