'use client';

import { motion } from 'framer-motion';
import { X, Sparkles, Check, AlertTriangle, ArrowRight, Wand2, FileSpreadsheet, Lock } from 'lucide-react';
import { INVOICE_TARGETS, type InvoiceTarget } from '@/lib/invoice/ingest/schema';
import type { InvoiceMapping } from '@/lib/invoice/ingest/apply';
import type { MappingSource } from '@/lib/invoice/ingest/mapper';

interface Props {
  filename: string;
  rowCount: number;
  fileHeaders: string[];
  mapping: InvoiceMapping;
  sources: Record<string, MappingSource>;
  sampleRow?: Record<string, string>;
  isGenerating: boolean;
  onChange: (path: string, col: string | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const SOURCE_STYLES: Record<MappingSource, { label: string; bg: string; color: string; border: string; Icon: typeof Check }> = {
  exact: { label: 'Automatique',    bg: 'bg-emerald-50 border-emerald-200', color: 'text-emerald-700', border: 'border-l-emerald-400', Icon: Check },
  ai:    { label: 'Suggéré par IA', bg: 'bg-indigo-50 border-indigo-200',   color: 'text-indigo-700',  border: 'border-l-indigo-400',  Icon: Sparkles },
  none:  { label: 'À assigner',     bg: 'bg-amber-50 border-amber-200',     color: 'text-amber-700',   border: 'border-l-amber-400',   Icon: AlertTriangle },
};

const SECTION_TITLES: Record<InvoiceTarget['section'], string> = {
  meta:   'Métadonnées',
  client: 'Client',
  line:   'Ligne d\'article',
};

const TYPE_HINTS: Record<InvoiceTarget['type'], string> = {
  string:    'texte',
  number:    'nombre',
  integer:   'entier',
  date:      'date',
  email:     'email',
  siret:     'SIRET 14 chiffres',
  vatNumber: 'N° TVA',
  iban:      'IBAN',
  currency:  'devise',
};

export function InvoiceMappingModal({
  filename, rowCount, fileHeaders, mapping, sources, sampleRow, isGenerating,
  onChange, onConfirm, onCancel,
}: Props) {
  const stats = computeStats(mapping, sources);
  const sectioned = bySection(INVOICE_TARGETS);
  const missingRequired = INVOICE_TARGETS.filter((t) => t.required && !mapping[t.path]).length;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[860px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 border-b border-slate-100">
          <button onClick={onCancel} className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/80">
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
              <h3 className="text-base font-semibold text-slate-900">Correspondance des champs de facture</h3>
              <p className="text-[12px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <FileSpreadsheet size={11} />
                <span className="font-medium text-slate-600">{filename}</span>
                <span className="text-slate-300">·</span>
                <span>{rowCount} facture{rowCount > 1 ? 's' : ''} à générer</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.exact > 0 && <StatPill icon={Check}        color="emerald" label={`${stats.exact} automatique${stats.exact > 1 ? 's' : ''}`} />}
            {stats.ai    > 0 && <StatPill icon={Sparkles}     color="indigo"  label={`${stats.ai} par IA`} />}
            {stats.none  > 0 && <StatPill icon={AlertTriangle} color="amber"   label={`${stats.none} à vérifier`} />}
            {missingRequired > 0 && <StatPill icon={Lock} color="red" label={`${missingRequired} requis manquant${missingRequired > 1 ? 's' : ''}`} />}
          </div>
        </div>

        {/* Body — sectioned */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50/40 space-y-5">
          {(['meta', 'client', 'line'] as const).map((section) => (
            <Section
              key={section}
              title={SECTION_TITLES[section]}
              hint={section === 'line' ? 'Une seule ligne d\'article par facture en mode actuel' : undefined}
            >
              {sectioned[section].map((t) => (
                <Row
                  key={t.path}
                  target={t}
                  fileHeaders={fileHeaders}
                  mapping={mapping}
                  sources={sources}
                  sampleRow={sampleRow}
                  onChange={onChange}
                />
              ))}
            </Section>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 bg-white">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            {missingRequired > 0 ? (
              <>
                <AlertTriangle size={12} className="text-red-500" />
                <span>Certains champs requis ne sont pas assignés — les factures concernées resteront en brouillon</span>
              </>
            ) : stats.none > 0 ? (
              <>
                <AlertTriangle size={12} className="text-amber-500" />
                <span>{stats.none} champ{stats.none > 1 ? 's' : ''} non assigné{stats.none > 1 ? 's' : ''} (optionnel{stats.none > 1 ? 's' : ''})</span>
              </>
            ) : (
              <>
                <Check size={12} className="text-emerald-500" />
                <span>Tous les champs sont prêts</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onCancel}
              disabled={isGenerating}
              className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isGenerating}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white text-xs font-semibold hover:from-slate-800 hover:to-slate-700 shadow-md shadow-slate-200 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isGenerating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  Générer {rowCount} facture{rowCount > 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Components ────────────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</h4>
        {hint && <span className="text-[10px] italic text-slate-400">{hint}</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function StatPill({ icon: Icon, color, label }: { icon: typeof Check; color: 'emerald'|'indigo'|'amber'|'red'; label: string }) {
  const styles = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    indigo:  'bg-indigo-50 border-indigo-200 text-indigo-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    red:     'bg-red-50 border-red-200 text-red-700',
  }[color];
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${styles}`}>
      <Icon size={11} strokeWidth={2.5} />
      {label}
    </div>
  );
}

function Row({
  target, fileHeaders, mapping, sources, sampleRow, onChange,
}: {
  target: InvoiceTarget;
  fileHeaders: string[];
  mapping: InvoiceMapping;
  sources: Record<string, MappingSource>;
  sampleRow?: Record<string, string>;
  onChange: (path: string, col: string | null) => void;
}) {
  const source: MappingSource = mapping[target.path] ? sources[target.path] ?? 'none' : 'none';
  const style = SOURCE_STYLES[source];
  const Icon = style.Icon;
  const col = mapping[target.path];
  const sample = col && sampleRow ? sampleRow[col] : '';
  const isRequired = target.required;
  const requiredMissing = isRequired && !col;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${style.border} ${requiredMissing ? 'border-red-300' : ''} p-3 hover:shadow-sm transition-all`}>
      <div className="grid grid-cols-[1fr,auto,1.2fr,auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-slate-800 truncate">{target.label}</span>
            {isRequired && <span className="text-[9px] font-bold text-red-500">REQUIS</span>}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">{TYPE_HINTS[target.type]}</span>
            {target.hint && <span className="italic truncate">{target.hint}</span>}
          </div>
        </div>

        <ArrowRight size={15} className="text-slate-300 shrink-0" />

        <div className="min-w-0">
          <select
            value={col ?? ''}
            onChange={(e) => onChange(target.path, e.target.value || null)}
            className={`w-full h-8 px-2.5 text-[12px] font-medium rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
              col ? 'border-slate-200 text-slate-800' : requiredMissing ? 'border-red-300 text-red-700 bg-red-50/50' : 'border-amber-200 text-amber-700 bg-amber-50/50'
            }`}
          >
            <option value="">— non assigné —</option>
            {fileHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          {sample && (
            <div className="text-[10px] text-slate-500 truncate mt-1 italic" title={sample}>
              ex: <span className="text-slate-700 font-medium not-italic">{sample}</span>
            </div>
          )}
          {!sample && col && (
            <div className="text-[10px] text-slate-400 truncate mt-1 italic">(vide dans la 1ʳᵉ ligne)</div>
          )}
        </div>

        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium shrink-0 ${style.bg} ${style.color}`}>
          <Icon size={10} strokeWidth={2.5} />
          {style.label}
        </div>
      </div>
    </div>
  );
}

// ─── Utils ─────────────────────────────────────────────────────────────────

function bySection(targets: InvoiceTarget[]): Record<InvoiceTarget['section'], InvoiceTarget[]> {
  const out: Record<InvoiceTarget['section'], InvoiceTarget[]> = { meta: [], client: [], line: [] };
  for (const t of targets) out[t.section].push(t);
  return out;
}

function computeStats(mapping: InvoiceMapping, sources: Record<string, MappingSource>) {
  const stats = { exact: 0, ai: 0, none: 0 };
  for (const t of INVOICE_TARGETS) {
    if (!mapping[t.path]) { stats.none++; continue; }
    const s = sources[t.path];
    if (s === 'exact') stats.exact++;
    else if (s === 'ai') stats.ai++;
    else stats.none++;
  }
  return stats;
}
