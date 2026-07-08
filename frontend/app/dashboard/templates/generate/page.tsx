'use client';

// Uses useSearchParams — render on demand instead of static prerender.
export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, RefreshCw, FileText, Upload, FileSpreadsheet, Package, X } from 'lucide-react';
import { templates } from '@/lib/api';
import { renderBlock, injectVariables, extractVariables } from '@/lib/contract-renderer';
import { renderTiptapToHtml } from '@/lib/tiptap/variable-node';
import { tryParsePdfTemplate, type PdfTemplate } from '../contract-editor/_lib/pdf-template';
import { exportPdfTemplateWithValues } from '../contract-editor/_lib/pdf-export';
import { parseCsv, slugifyHeader } from '../contract-editor/_lib/csv';
import toast from '@/lib/toast';



// ─── Variable grouping ────────────────────────────────────────────────────────

const GROUPS: { label: string; match: (k: string) => boolean; color: string }[] = [
  { label: 'Client',           match: (k) => k.startsWith('client_'),                                                  color: 'text-blue-600' },
  { label: 'Prestataire',      match: (k) => k.startsWith('prestataire_'),                                             color: 'text-violet-600' },
  { label: 'Prix & Paiement',  match: (k) => k.startsWith('montant_') || k.startsWith('tva') || k.startsWith('frais'), color: 'text-emerald-600' },
  { label: 'Dates',            match: (k) => k.startsWith('date_') || k.endsWith('_date') || k.includes('date'),       color: 'text-amber-600' },
  { label: 'Abonnement',       match: (k) => ['nom_offre','description_offre','montant_mensuel','duree_engagement','seuil_usage','operateur_reseau','ics_sepa','delai_activation','delai_resiliation','mediateur_nom','mediateur_url','frais_non_restitution','nom_conseiller'].includes(k), color: 'text-cyan-600' },
  { label: 'Document',         match: (k) => ['numero_contrat','version_contrat','nom_site','url_site','reference_marche','nom_marche','pouvoir_adjudicateur','duree_marche'].includes(k), color: 'text-slate-600' },
  { label: 'Autres',           match: () => true,                                                                       color: 'text-slate-400' },
];



function groupVariables(vars: string[]): { label: string; color: string; keys: string[] }[] {
  const used = new Set<string>();
  return GROUPS.map(({ label, match, color }) => {
    const keys = vars.filter((k) => !used.has(k) && match(k));
    keys.forEach((k) => used.add(k));
    return { label, color, keys };
  }).filter((g) => g.keys.length > 0);
}

function labelFor(key: string): string {
  return key
    .replaceAll('_', ' ')
    .replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

/** Filesystem-safe fragment from arbitrary text. */
function safeName(s: string): string {
  return s.replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
}

interface ImportedData {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
}

// ─── Main content ─────────────────────────────────────────────────────────────

function GenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id') ?? '';
  const templateName = searchParams.get('name') ?? 'Contrat';

  const [schemaVars, setSchemaVars] = useState<string[]>([]);
  const [templateContent, setTemplateContent] = useState<string>('');
  const [pdfTpl, setPdfTpl] = useState<PdfTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Bulk import state
  const [imported, setImported] = useState<ImportedData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [savedMapping, setSavedMapping] = useState<Record<string, string>>({}); // from the template
  const [showMapping, setShowMapping] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // PDF live-preview (regenerated from `values`)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const isPdf = pdfTpl !== null;

  // Load template, then detect kind + extract variables.
  useEffect(() => {
    if (!templateId) return;
    templates.get(templateId)
      .then((result: unknown) => {
        const r = result as { template?: { content?: string; name?: string }; content?: string; name?: string } | null;
        const tmpl = r?.template ?? r;
        const content: string = tmpl?.content ?? '';
        setTemplateContent(content);

        const pdf = tryParsePdfTemplate(content);
        setPdfTpl(pdf);

        const vars = pdf
          ? Array.from(new Set(pdf.placements.filter((p) => p.type !== 'text' && p.variableName).map((p) => p.variableName))).sort()
          : extractVariables(content);
        setSchemaVars(vars);
        const init: Record<string, string> = {};
        vars.forEach((k) => { init[k] = ''; });
        setValues(init);

        // Reuse the column→variable mapping the user already configured in the
        // editor (stored on the template's CSV datasets) so the generate page
        // doesn't ask them to map again. PDF templates now persist csvDatasets
        // alongside the PDF JSON, so read it for both kinds.
        try {
          const parsed = JSON.parse(content);
          const saved: Record<string, string> = {};
          for (const ds of (parsed.csvDatasets ?? []) as { mapping?: Record<string, string | null> }[]) {
            for (const [v, h] of Object.entries(ds.mapping ?? {})) if (h) saved[v] = h;
          }
          setSavedMapping(saved);
        } catch { /* no datasets */ }
      })
      .catch(() => toast.error('Erreur chargement du template'))
      .finally(() => setLoading(false));
  }, [templateId]);

  const groups = useMemo(() => groupVariables(schemaVars), [schemaVars]);

  // Map one imported row to variable values via the detected column mapping.
  const rowToValues = useCallback((row: Record<string, string>, map: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const v of schemaVars) { const h = map[v]; out[v] = h ? (row[h] ?? '') : ''; }
    return out;
  }, [schemaVars]);

  // For PDF, empty fields render as their {{token}} so the layout stays visible.
  const pdfPreviewValues = useCallback((src: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const v of schemaVars) out[v] = src[v]?.trim() ? src[v] : `{{${v}}}`;
    return out;
  }, [schemaVars]);

  // Best-effort auto-match each variable to a column header (slug equality).
  const autoMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!imported) return map;
    for (const v of schemaVars) {
      const slug = slugifyHeader(v);
      const hit = imported.headers.find((h) => h === slug || h === v);
      if (hit) map[v] = hit;
    }
    return map;
  }, [imported, schemaVars]);

  // Seed the mapping on import: prefer the template's saved mapping (when its
  // column exists in the imported file), else fall back to header auto-match.
  useEffect(() => {
    if (!imported) return;
    const seed: Record<string, string> = {};
    for (const v of schemaVars) {
      if (savedMapping[v] && imported.headers.includes(savedMapping[v])) seed[v] = savedMapping[v];
      else if (autoMap[v]) seed[v] = autoMap[v];
    }
    setMapping(seed);
  }, [imported, autoMap, savedMapping, schemaVars]);

  const matchedVars = useMemo(() => schemaVars.filter((v) => mapping[v]), [schemaVars, mapping]);

  // Preview reflects the first imported row (if any), else the manual form.
  const effectiveValues = useMemo(
    () => (imported && imported.rows.length ? rowToValues(imported.rows[0], mapping) : values),
    [imported, rowToValues, mapping, values],
  );

  // For previews, unfilled variables show as their {{token}} (not blank).
  const displayValues = useMemo(() => pdfPreviewValues(effectiveValues), [pdfPreviewValues, effectiveValues]);

  // ── HTML live preview (non-PDF templates) ──
  const previewHtml = useMemo(() => {
    if (isPdf || !templateContent) return '';
    try {
      const parsed = JSON.parse(templateContent);
      if (parsed.doc?.type === 'doc') {
        const full = renderTiptapToHtml(parsed.doc, displayValues);
        const match = full.match(/<body>([\s\S]*)<\/body>/);
        return match ? match[1] : full;
      }
      const blocks: { type: string; content: string }[] = parsed.blocks ?? [];
      return blocks
        .map((b) => `<div style="page-break-inside:avoid;">${renderBlock(b, displayValues)}</div>`)
        .join('');
    } catch {
      return `<pre style="font-size:10pt;white-space:pre-wrap;">${injectVariables(templateContent, displayValues)}</pre>`;
    }
  }, [isPdf, templateContent, displayValues]);

  // ── PDF live preview: debounce-regenerate a stamped blob on value changes ──
  useEffect(() => {
    if (!pdfTpl) return;
    let cancelled = false;
    let url: string | null = null;
    const t = setTimeout(async () => {
      try {
        const blob = await exportPdfTemplateWithValues(pdfTpl, { values: displayValues });
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPdfPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      } catch { /* preview is best-effort */ }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); if (url) URL.revokeObjectURL(url); };
  }, [pdfTpl, displayValues]);

  const buildPrintHtml = useCallback((vars: Record<string, string>, docName: string): string => {
    try {
      const parsed = JSON.parse(templateContent);
      if (parsed.doc?.type === 'doc') {
        return renderTiptapToHtml(parsed.doc, vars, { docName });
      }
      const blocks: { type: string; content: string }[] = parsed.blocks ?? [];
      const body = blocks
        .map((b) => `<div style="page-break-inside:avoid;">${renderBlock(b, vars)}</div>`)
        .join('');
      return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><style>@page{size:A4;margin:18mm 20mm;}*{box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10pt;color:#1a1a1a;margin:0;padding:0;line-height:1.6;}table{border-collapse:collapse;}</style></head><body>${body}</body></html>`;
    } catch {
      const text = injectVariables(templateContent, vars);
      return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><style>@page{size:A4;margin:18mm 20mm;}body{font-family:Arial,sans-serif;font-size:10pt;}</style></head><body><pre style="white-space:pre-wrap;">${text}</pre></body></html>`;
    }
  }, [templateContent]);

  // Produce a filled PDF blob for one record (works for PDF & HTML templates).
  const generateBlob = useCallback(async (vars: Record<string, string>): Promise<Blob> => {
    if (pdfTpl) {
      return exportPdfTemplateWithValues(pdfTpl, { values: vars });
    }
    const html = buildPrintHtml(vars, templateName);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/templates/render-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ html, name: templateName }),
    });
    if (!res.ok) throw new Error('PDF generation failed');
    return res.blob();
  }, [pdfTpl, buildPrintHtml, templateName]);

  // ── Single PDF (manual form) ──
  const handleGenerate = async () => {
    setGenerating(true);
    const toastId = toast.loading('Génération du PDF...');
    try {
      const blob = await generateBlob(values);
      triggerDownload(blob, `${safeName(templateName)}.pdf`);
      toast.success('PDF généré et téléchargé', { id: toastId });
    } catch {
      toast.error('Erreur lors de la génération', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  // ── Data import (CSV / TXT / TSV / Excel) ──
  const handleFile = async (file: File) => {
    try {
      const name = file.name.toLowerCase();
      let parsed: { headers: string[]; rows: Record<string, string>[] };
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        parsed = parseCsv(csv);
      } else {
        parsed = parseCsv(await file.text());
      }
      if (parsed.rows.length === 0) {
        toast.error('Aucune ligne de données trouvée dans le fichier');
        return;
      }
      setImported({ ...parsed, fileName: file.name });
      toast.success(`${parsed.rows.length} ligne(s) importée(s)`);
    } catch {
      toast.error('Impossible de lire le fichier');
    }
  };

  // ── Bulk generate → ZIP ──
  const handleGenerateZip = async () => {
    if (!imported) return;
    setGenerating(true);
    setBulkProgress({ done: 0, total: imported.rows.length });
    const toastId = toast.loading(`Génération de ${imported.rows.length} contrats...`);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (let i = 0; i < imported.rows.length; i++) {
        const rowValues = rowToValues(imported.rows[i], mapping);
        const blob = await generateBlob(rowValues);

        // Name each file from name/last_name when available, else the row index.
        const labelBase = safeName(
          [rowValues['name'] || rowValues['nom'] || rowValues['prenom'], rowValues['last_name'] || rowValues['nom_famille']]
            .filter(Boolean).join('_') || `ligne_${i + 1}`,
        ) || `ligne_${i + 1}`;
        let fileName = `${labelBase}.pdf`;
        let n = 2;
        while (usedNames.has(fileName)) fileName = `${labelBase}_${n++}.pdf`;
        usedNames.add(fileName);

        zip.file(fileName, blob);
        setBulkProgress({ done: i + 1, total: imported.rows.length });
      }

      const out = await zip.generateAsync({ type: 'blob' });
      triggerDownload(out, `${safeName(templateName)}_contrats.zip`);
      toast.success(`${imported.rows.length} contrats générés (ZIP)`, { id: toastId });
    } catch {
      toast.error('Erreur lors de la génération groupée', { id: toastId });
    } finally {
      setGenerating(false);
      setBulkProgress(null);
    }
  };

  const filledCount = schemaVars.filter((k) => values[k]?.trim()).length;
  const total = schemaVars.length;
  const percent = total > 0 ? Math.round((filledCount / total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} /> Retour
          </button>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground/80 truncate max-w-xs">{templateName}</span>
            {isPdf && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">PDF</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!imported && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{filledCount}/{total} champs</span>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || filledCount < 1}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                {generating
                  ? <><RefreshCw size={13} className="animate-spin" /> Génération...</>
                  : <><Download size={13} /> Générer le PDF</>}
              </button>
            </>
          )}
          {imported && (
            <button
              onClick={handleGenerateZip}
              disabled={generating || matchedVars.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              {generating
                ? <><RefreshCw size={13} className="animate-spin" /> {bulkProgress ? `${bulkProgress.done}/${bulkProgress.total}` : '...'}</>
                : <><Package size={13} /> Générer {imported.rows.length} contrats (ZIP)</>}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — import + dynamic form */}
        <div className="w-[38%] border-r border-border overflow-y-auto bg-slate-50/50">
          <div className="p-5 space-y-5">
            {/* Bulk import card */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Import de données</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5 mb-2.5">
                Importez un fichier (CSV, TXT, Excel) — une ligne = un contrat.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv,.xls,.xlsx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
              {!imported ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <Upload size={14} /> Importer un fichier de données
                </button>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet size={15} className="text-indigo-500 shrink-0" />
                      <span className="text-xs font-medium text-slate-700 truncate">{imported.fileName}</span>
                    </div>
                    <button onClick={() => setImported(null)} className="text-slate-400 hover:text-slate-700" title="Retirer">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-slate-500">
                      {imported.rows.length} ligne(s) · {matchedVars.length}/{schemaVars.length} variable(s) associée(s)
                    </div>
                    <button
                      onClick={() => setShowMapping((s) => !s)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {showMapping ? 'Masquer' : 'Ajuster le mapping'}
                    </button>
                  </div>

                  {matchedVars.length === schemaVars.length && !showMapping && (
                    <p className="text-[11px] text-emerald-600">✓ Colonnes associées automatiquement (mapping du template).</p>
                  )}
                  {matchedVars.length < schemaVars.length && !showMapping && (
                    <p className="text-[11px] text-amber-600">
                      {schemaVars.length - matchedVars.length} variable(s) non associée(s) — cliquez « Ajuster le mapping ».
                    </p>
                  )}

                  {/* Map each template variable to a column from the file. */}
                  {showMapping && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Associer les colonnes</div>
                      {schemaVars.map((v) => (
                        <div key={v} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-600 w-1/2 truncate" title={v}>{v}</span>
                          <span className="text-slate-300">←</span>
                          <select
                            value={mapping[v] ?? ''}
                            onChange={(e) => setMapping((prev) => ({ ...prev, [v]: e.target.value }))}
                            className={`flex-1 h-7 text-[11px] rounded border px-1.5 bg-white ${mapping[v] ? 'border-emerald-300 text-slate-700' : 'border-slate-200 text-slate-400'}`}
                          >
                            <option value="">— ignorer —</option>
                            {imported.headers.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Manual fill form (single generate). Hidden in bulk mode for clarity. */}
            {!imported && (
              <>
                <div className="pt-1 border-t border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900 mt-3">Remplissez les variables</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {total} variable{total !== 1 ? 's' : ''} détectée{total !== 1 ? 's' : ''} dans ce template
                  </p>
                </div>

                {groups.map((group) => (
                  <motion.div key={group.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={`text-[11px] font-bold uppercase tracking-wide mb-2.5 ${group.color}`}>
                      {group.label}
                    </div>
                    <div className="space-y-2">
                      {group.keys.map((key) => (
                        <div key={key}>
                          <label className="text-[11px] text-slate-500 block mb-1">{labelFor(key)}</label>
                          <input
                            value={values[key] ?? ''}
                            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={`{{${key}}}`}
                            className="w-full h-8 px-2.5 text-xs rounded-lg border border-input bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}

                {total === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Aucune variable détectée dans ce template
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right — live preview */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {imported ? 'Aperçu (première ligne non appliquée — édition manuelle)' : 'Aperçu en temps réel'}
            </span>
            {!imported && percent === 100 && (
              <span className="text-[11px] text-emerald-600 font-medium">✓ Tous les champs remplis</span>
            )}
          </div>

          {isPdf ? (
            pdfPreviewUrl ? (
              <iframe
                title="Aperçu PDF"
                src={pdfPreviewUrl}
                className="bg-white shadow-sm mx-auto w-full rounded-lg"
                style={{ height: 'calc(100vh - 140px)', border: 'none' }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                <RefreshCw size={16} className="animate-spin mr-2" /> Préparation de l&apos;aperçu…
              </div>
            )
          ) : (
            <div
              className="bg-white shadow-sm mx-auto"
              style={{ width: '210mm', minHeight: '297mm', padding: '18mm 20mm', fontFamily: 'Arial, sans-serif', color: '#1a1a1a' }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GenerateContent />
    </Suspense>
  );
}
