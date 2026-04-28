'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, RefreshCw, FileText } from 'lucide-react';
import { templates } from '@/lib/api';
import { renderBlock, injectVariables } from '@/lib/contract-renderer';
import toast from 'react-hot-toast';

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
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Main content ─────────────────────────────────────────────────────────────

function GenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id') ?? '';
  const templateName = searchParams.get('name') ?? 'Contrat';

  const [schemaVars, setSchemaVars] = useState<string[]>([]);
  const [templateContent, setTemplateContent] = useState<string>('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Load schema + template content
  useEffect(() => {
    if (!templateId) return;
    Promise.all([
      fetch(`http://localhost:3000/templates/${templateId}/schema`, { credentials: 'include' }).then((r) => r.json()),
      templates.get(templateId),
    ])
      .then(([schema, tmpl]) => {
        const vars: string[] = schema.required_variables ?? [];
        setSchemaVars(vars);
        setTemplateContent(tmpl.content ?? '');
        // Pre-fill empty values
        const init: Record<string, string> = {};
        vars.forEach((k) => { init[k] = ''; });
        setValues(init);
      })
      .catch(() => toast.error('Erreur chargement du template'))
      .finally(() => setLoading(false));
  }, [templateId]);

  const groups = useMemo(() => groupVariables(schemaVars), [schemaVars]);

  // Live preview HTML
  const previewHtml = useMemo(() => {
    if (!templateContent) return '';
    try {
      const parsed = JSON.parse(templateContent);
      const blocks: { type: string; content: string }[] = parsed.blocks ?? [];
      return blocks
        .map((b) => `<div style="page-break-inside:avoid;">${renderBlock(b, values)}</div>`)
        .join('');
    } catch {
      // Plain text fallback (email/other)
      return `<pre style="font-size:10pt;white-space:pre-wrap;">${injectVariables(templateContent, values)}</pre>`;
    }
  }, [templateContent, values]);

  const handleGenerate = async () => {
    setGenerating(true);
    const toastId = toast.loading('Génération du PDF...');
    try {
      const res = await fetch(`http://localhost:3000/templates/${templateId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ variables: values }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF généré et téléchargé', { id: toastId });
    } catch {
      toast.error('Erreur lors de la génération', { id: toastId });
    } finally {
      setGenerating(false);
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
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{filledCount}/{total} champs</span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || filledCount === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            {generating
              ? <><RefreshCw size={13} className="animate-spin" /> Génération...</>
              : <><Download size={13} /> Générer le PDF</>}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — dynamic form */}
        <div className="w-[38%] border-r border-border overflow-y-auto bg-slate-50/50">
          <div className="p-5 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Remplissez les variables</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {total} variable{total !== 1 ? 's' : ''} détectée{total !== 1 ? 's' : ''} dans ce template
              </p>
            </div>

            {groups.map((group) => (
              <motion.div
                key={group.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
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
          </div>
        </div>

        {/* Right — live A4 preview */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Aperçu en temps réel
            </span>
            {percent === 100 && (
              <span className="text-[11px] text-emerald-600 font-medium">✓ Tous les champs remplis</span>
            )}
          </div>
          <div
            className="bg-white shadow-sm mx-auto"
            style={{ width: '210mm', minHeight: '297mm', padding: '18mm 20mm', fontFamily: 'Arial, sans-serif', color: '#1a1a1a' }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
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
