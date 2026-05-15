'use client';

import { Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, Download, ChevronDown, FileDown } from 'lucide-react';
import { templates } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Invoice, InvoiceData } from '@/lib/invoice/types';
import { defaultInvoice } from '@/lib/invoice/defaults';
import { deserialize, serialize } from '@/lib/invoice/serialize';
import { invoiceReducer } from '@/lib/invoice/reducer';
import { renderInvoiceHtml } from '@/lib/invoice/renderer';
import { computeTotals, formatMoney } from '@/lib/invoice/compute';
import { buildInvoiceMapping, type MappingSource } from '@/lib/invoice/ingest/mapper';
import { applyMappingToRow, type InvoiceMapping } from '@/lib/invoice/ingest/apply';
import type { ParsedFile } from '@/lib/invoice/ingest/parse-file';
import { OutlinePanel } from '@/components/invoice/OutlinePanel';
import { InspectorPanel } from '@/components/invoice/InspectorPanel';
import { BLOCK_COMPONENTS } from '@/components/invoice/blocks';
import { InvoiceImportModal } from '@/components/invoice/InvoiceImportModal';
import { InvoiceMappingModal } from '@/components/invoice/InvoiceMappingModal';

const INVOICE_TYPES: { value: InvoiceData['type']; label: string; color: string }[] = [
  { value: 'standard',   label: 'Standard',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'pro-forma',  label: 'Pro-forma',   color: 'bg-slate-50 text-slate-600 border-slate-200' },
  { value: 'acompte',    label: 'Acompte',     color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'solde',      label: 'Solde',       color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'avoir',      label: 'Avoir',       color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'recurrente', label: 'Récurrente',  color: 'bg-violet-50 text-violet-700 border-violet-200' },
];

function fontStack(font: Invoice['theme']['font']): string {
  if (font === 'roboto')   return '"Roboto", Arial, sans-serif';
  if (font === 'opensans') return '"Open Sans", Arial, sans-serif';
  return '"Inter", "Helvetica Neue", Arial, sans-serif';
}

function InvoiceEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id');
  const isEditMode = !!templateId;

  const [invoice, dispatch] = useReducer(invoiceReducer, defaultInvoice());
  const [name, setName] = useState(searchParams.get('name') ?? 'Nouvelle facture');
  const [description] = useState(searchParams.get('description') ?? '');
  const [loading, setLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  // ── CSV import flow state ──────────────────────────────────────────────
  const [importFile, setImportFile] = useState<ParsedFile | null>(null);
  const [showImportPicker, setShowImportPicker] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [mappingState, setMappingState] = useState<{
    mapping: InvoiceMapping;
    sources: Record<string, MappingSource>;
  } | null>(null);

  const loadedFor = useRef<string | null>(null);

  // ── Load existing template ─────────────────────────────────────────────
  useEffect(() => {
    if (!templateId) return;
    if (loadedFor.current === templateId) return;
    loadedFor.current = templateId;
    templates.get(templateId)
      .then((result: unknown) => {
        const r = result as { template?: { content?: string; name?: string }; content?: string; name?: string } | null;
        const tmpl = r?.template ?? r;
        const next = deserialize(tmpl?.content);
        dispatch({ type: 'invoice/replace', invoice: next });
        if (tmpl?.name) setName(tmpl.name);
      })
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, [templateId]);

  // ── Save / Update ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const body = {
        name,
        description,
        type: 2,
        content: serialize(invoice),
      };
      if (isEditMode && templateId) {
        await templates.update(templateId, body);
        toast.success('Facture enregistrée');
      } else {
        await templates.create(body);
        toast.success('Facture créée');
      }
      router.push('/dashboard/templates');
    } catch {
      toast.error('Échec de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  }, [invoice, name, description, isEditMode, templateId, router]);

  // ── PDF download ───────────────────────────────────────────────────────
  const handleDownloadPdf = useCallback(async () => {
    setIsDownloading(true);
    const toastId = toast.loading('Génération du PDF...');
    try {
      const html = renderInvoiceHtml(invoice);
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
    } catch {
      toast.error('Échec de la génération PDF', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  }, [invoice, name]);

  // ── CSV import: step 1 — file picked, run AI mapping ───────────────────
  const handleFileParsed = useCallback(async (file: ParsedFile) => {
    setShowImportPicker(false);
    setImportFile(file);
    setIsAnalyzing(true);
    const toastId = toast.loading('Analyse IA des colonnes…');
    try {
      const result = await buildInvoiceMapping(file.headers, file.rows[0]);
      toast.dismiss(toastId);
      setMappingState(result);
    } catch {
      toast.error('Échec de l\'analyse — vous pourrez assigner manuellement', { id: toastId });
      setMappingState({
        mapping: {},
        sources: {},
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // ── CSV import: step 2 — user confirmed, generate N invoices as PDFs ────
  const handleBatchGenerate = useCallback(async () => {
    if (!importFile || !mappingState) return;
    setIsBatchGenerating(true);
    const toastId = toast.loading(`Génération de ${importFile.rows.length} facture(s)…`);
    const baseName = importFile.filename.replace(/\.[^.]+$/, '');
    let success = 0;
    let errorRows = 0;

    for (let i = 0; i < importFile.rows.length; i++) {
      const { invoice: filledInvoice, validation } = applyMappingToRow(invoice, importFile.rows[i], mappingState.mapping);
      if (validation.errors.length > 0) errorRows++;
      try {
        const html = renderInvoiceHtml(filledInvoice);
        const res = await fetch('http://localhost:3000/templates/render-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ html, name: `${baseName}_${i + 1}` }),
        });
        if (!res.ok) continue;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filledInvoice.data.number || `${baseName}_${i + 1}`}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        success++;
        toast.loading(`Génération… ${i + 1}/${importFile.rows.length}`, { id: toastId });
        if (i < importFile.rows.length - 1) await new Promise((r) => setTimeout(r, 250));
      } catch { /* skip */ }
    }

    setIsBatchGenerating(false);
    setMappingState(null);
    setImportFile(null);
    if (success === importFile.rows.length && errorRows === 0) {
      toast.success(`${success} facture(s) générée(s)`, { id: toastId });
    } else if (errorRows > 0) {
      toast.success(`${success}/${importFile.rows.length} générée(s) · ${errorRows} avec champs requis manquants`, { id: toastId });
    } else {
      toast.error(`${success}/${importFile.rows.length} générée(s)`, { id: toastId });
    }
  }, [importFile, mappingState, invoice]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const typeCfg = INVOICE_TYPES.find((t) => t.value === invoice.data.type) ?? INVOICE_TYPES[0];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" onClick={() => setShowTypeMenu(false)}>
      {/* ── Toolbar ── */}
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={15} /> Retour
          </button>
          <div className="w-px h-4 bg-border" />
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowTypeMenu((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${typeCfg.color}`}
            >
              {typeCfg.label} <ChevronDown size={11} />
            </button>
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                {INVOICE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { dispatch({ type: 'data/setType', value: t.value }); setShowTypeMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${invoice.data.type === t.value ? 'font-semibold text-slate-900' : 'text-slate-500'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-sm font-medium text-foreground/80 bg-transparent text-center focus:outline-none focus:bg-slate-50 rounded px-2 py-1 max-w-xs"
          placeholder="Nom de la facture"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportPicker(true)}
            disabled={isAnalyzing || isBatchGenerating}
            title="Générer plusieurs factures depuis un CSV/Excel"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            <FileDown size={13} /> {isAnalyzing ? 'Analyse…' : 'CSV → Factures'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Save size={13} /> {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <Download size={13} /> {isDownloading ? 'Génération…' : 'Télécharger PDF'}
          </button>
        </div>
      </div>

      {/* ── 3-panel body ── */}
      <div className="flex flex-1 overflow-hidden">
        <OutlinePanel
          invoice={invoice}
          dispatch={dispatch}
          selectedBlock={selectedBlock}
          onSelectBlock={setSelectedBlock}
        />

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6" onClick={() => setSelectedBlock(null)}>
          <div
            className="bg-white shadow-sm mx-auto"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '18mm 20mm',
              fontFamily: fontStack(invoice.theme.font),
              color: invoice.theme.colors.text,
              fontSize: invoice.theme.fontScale === 'sm' ? '9pt' : invoice.theme.fontScale === 'lg' ? '11pt' : '10pt',
              background:
                invoice.theme.background === 'header_band'
                  ? `linear-gradient(${invoice.theme.colors.primary} 0, ${invoice.theme.colors.primary} 6mm, #fff 6mm)`
                  : '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {invoice.layout.blockOrder.map((id) => {
              if (!invoice.layout.blockVisibility[id]) return null;
              const Block = BLOCK_COMPONENTS[id];
              return (
                <Block
                  key={id}
                  invoice={invoice}
                  dispatch={dispatch}
                  selectedBlock={selectedBlock}
                  onSelectBlock={setSelectedBlock}
                />
              );
            })}
          </div>

          {/* Live total badge — floats bottom-right of canvas */}
          <div className="fixed bottom-6 right-76 z-10 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total TTC</div>
            <div className="text-lg font-bold text-slate-900">
              <LiveTotal invoice={invoice} />
            </div>
          </div>
        </div>

        <InspectorPanel invoice={invoice} dispatch={dispatch} />
      </div>

      {/* ── CSV import modals ── */}
      <AnimatePresence>
        {showImportPicker && (
          <InvoiceImportModal
            onCancel={() => setShowImportPicker(false)}
            onParsed={handleFileParsed}
          />
        )}
        {mappingState && importFile && (
          <InvoiceMappingModal
            filename={importFile.filename}
            rowCount={importFile.rows.length}
            fileHeaders={importFile.headers}
            mapping={mappingState.mapping}
            sources={mappingState.sources}
            sampleRow={importFile.rows[0]}
            isGenerating={isBatchGenerating}
            onChange={(path, col) =>
              setMappingState((prev) => prev ? {
                mapping: { ...prev.mapping, [path]: col },
                sources: { ...prev.sources, [path]: col ? (prev.sources[path] ?? 'none') : 'none' },
              } : prev)
            }
            onConfirm={handleBatchGenerate}
            onCancel={() => { setMappingState(null); setImportFile(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveTotal({ invoice }: { invoice: Invoice }) {
  const totals = computeTotals(invoice.data);
  return <>{formatMoney(totals.totalTTC, invoice.data.currency)}</>;
}

export default function InvoiceEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InvoiceEditorContent />
    </Suspense>
  );
}
