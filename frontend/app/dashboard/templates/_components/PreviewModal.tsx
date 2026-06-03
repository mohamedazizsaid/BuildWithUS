'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, X } from 'lucide-react';
import { mjmlToPreviewHtml, tiptapDocToPreviewHtml, findContractTitle } from '../_lib/preview-helpers';
import { getTypeConfig, type Template } from '../_lib/types';
import { deserialize } from '@/lib/invoice/serialize';
import { renderInvoiceHtml } from '@/lib/invoice/renderer';
import { type PdfTemplate, tryParsePdfTemplate } from '../contract-editor/_lib/pdf-template';
import { exportPdfTemplateWithValues } from '../contract-editor/_lib/pdf-export';

/** Renders a PDF-template contract as the real stamped PDF in an iframe.
 *  Variables are surfaced as `{{token}}`; static text & shapes are baked in. */
function PdfTemplatePreview({ template }: { template: PdfTemplate }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const values: Record<string, string> = {};
        for (const p of template.placements) {
          if (p.type !== 'text' && p.variableName) values[p.variableName] = `{{${p.variableName}}}`;
        }
        const blob = await exportPdfTemplateWithValues(template, { values });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [template]);

  if (failed) return <div className="p-8 text-center text-slate-400 text-sm">Aperçu PDF indisponible</div>;
  if (!url)   return <div className="p-8 text-center text-slate-400 text-sm">Chargement de l&apos;aperçu…</div>;
  return (
    <iframe
      title="Aperçu PDF"
      src={url}
      className="w-full bg-white rounded-lg"
      style={{ height: 'calc(85vh - 130px)', border: 'none' }}
    />
  );
}

function ModalContractInvoicePreview({ template }: { template: Template }) {
  const type = template.type?.toLowerCase();

  if (type === 'contrat') {
    // PDF-template contracts: render the real stamped PDF rather than TipTap/blocks.
    const pdfTpl = tryParsePdfTemplate(template.content);
    // Key by template identity so a different template remounts the preview
    // (resetting url/failed) instead of resetting state inside the effect.
    if (pdfTpl) return <PdfTemplatePreview key={`${template.id}:${template.updated_at}`} template={pdfTpl} />;

    try {
      const data = JSON.parse(template.content);
      const contractLabels: Record<string, string> = {
        b2c: 'B2C — Particulier', b2b: 'B2B — Entreprise',
        web: 'Web / E-commerce', aop: "Appel d'Offre Public", abonnement: 'Abonnement',
      };

      if (data.doc?.type === 'doc') {
        const html = tiptapDocToPreviewHtml(data.doc);
        const title = findContractTitle(data.doc);
        return (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">{contractLabels[data.contractType] || 'Contrat'}</span>
                {title && <span className="text-[11px] text-slate-400">— {title}</span>}
              </div>
              <span className="text-[10px] text-slate-400">v{data.version || 1}</span>
            </div>
            <div
              className="px-10 py-8"
              style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', color: '#1a1a1a', lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: html || '<div style="text-align:center;color:#94a3b8;padding:40px;">Aucun contenu</div>' }}
            />
          </div>
        );
      }

      const blocks: { type: string; content: string }[] = data.blocks || [];

      const renderBlock = (block: { type: string; content: string }, idx: number) => {
        const text = block.content.replaceAll(/\{\{[\w]+\}\}/g, '...').substring(0, 300);
        switch (block.type) {
          case 'contract_header': {
            const fields: Record<string, string> = {};
            block.content.split('\n').forEach((l) => { const i = l.indexOf(':'); if (i > 0) fields[l.substring(0, i).trim()] = l.substring(i + 1).trim(); });
            return (
              <div key={idx} className="mb-4 pb-4 border-b-2 border-slate-900">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-black text-lg text-slate-900">{(fields['entreprise'] || '').replaceAll(/\{\{[\w]+\}\}/g, '...')}</div>
                    <div className="text-xs text-slate-400">{(fields['adresse'] || '').replaceAll(/\{\{[\w]+\}\}/g, '...')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{(fields['numero'] || '').replaceAll(/\{\{[\w]+\}\}/g, '...')}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{(fields['version'] || '').replaceAll(/\{\{[\w]+\}\}/g, '...')}</div>
                  </div>
                </div>
                <div className="text-center font-black uppercase tracking-wide text-sm mt-3">
                  {(fields['titre'] || '').replaceAll(/\{\{[\w]+\}\}/g, '...')}
                </div>
              </div>
            );
          }
          case 'article':
            return <div key={idx} className="font-bold text-sm mt-4 mb-1 text-slate-900">{text}</div>;
          case 'legal_article': {
            const lines = text.split('\n');
            return (
              <div key={idx} className="mb-3">
                <div className="font-bold text-xs text-slate-900 mb-1">{lines[0]}</div>
                <div className="text-xs text-slate-500 leading-relaxed line-clamp-3">{lines.slice(1).join(' ')}</div>
              </div>
            );
          }
          case 'parties':
            return <div key={idx} className="text-xs text-slate-600 bg-slate-50 border-l-2 border-slate-900 p-3 rounded-r mb-3 leading-relaxed line-clamp-4">{text}</div>;
          case 'pricing_ttc': {
            const f: Record<string, string> = {};
            block.content.split('\n').forEach((l) => { const i = l.indexOf(':'); if (i > 0) f[l.substring(0, i).trim()] = l.substring(i + 1).trim(); });
            return (
              <div key={idx} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3 text-xs">
                <div className="font-semibold text-emerald-800 mb-1">Récapitulatif financier</div>
                <div className="flex justify-between text-slate-600"><span>HT</span><span>{(f['montant_ht'] || '...').replaceAll(/\{\{[\w]+\}\}/g, '...')} €</span></div>
                <div className="flex justify-between text-slate-600"><span>TVA {f['tva_rate'] || '20'}%</span><span>{(f['montant_tva'] || '...').replaceAll(/\{\{[\w]+\}\}/g, '...')} €</span></div>
                <div className="flex justify-between font-bold text-emerald-700 border-t border-emerald-200 mt-1 pt-1"><span>TTC</span><span>{(f['montant_ttc'] || '...').replaceAll(/\{\{[\w]+\}\}/g, '...')} €</span></div>
              </div>
            );
          }
          case 'signature_block':
            return (
              <div key={idx} className="mt-6 pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 mb-4">{text}</div>
                <div className="flex justify-between">
                  {['Prestataire', 'Client', 'Conseiller'].map((s) => (
                    <div key={s} className="text-center w-1/3">
                      <div className="h-8 border-b border-slate-400 mb-1" />
                      <div className="text-[10px] text-slate-400">{s}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          case 'divider':
            return <hr key={idx} className="my-3 border-slate-200" />;
          case 'info_box':
            return <div key={idx} className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-slate-600 mb-3 leading-relaxed">{text}</div>;
          default:
            return text ? <div key={idx} className="text-xs text-slate-600 leading-relaxed mb-2">{text}</div> : null;
        }
      };

      return (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50 rounded-t-lg">
            <span className="text-xs font-semibold text-slate-600">{contractLabels[data.contractType] || 'Contrat'}</span>
            <span className="text-[10px] text-slate-400">v{data.version || 1} · {blocks.length} blocs</span>
          </div>
          <div className="p-6" style={{ fontFamily: 'Georgia, serif', fontSize: '11pt', color: '#1a1a1a' }}>
            {blocks.map((block, i) => renderBlock(block, i))}
          </div>
        </div>
      );
    } catch {
      return <div className="p-8 text-center text-slate-400 text-sm">Contenu invalide</div>;
    }
  }

  if (type === 'facture') {
    // Render the same HTML the PDF service receives, so the modal is a faithful
    // preview of the saved invoice — including `{{variable}}` placeholders
    // surfaced as inline tokens. We inject a small stylesheet over the renderer
    // output to highlight the tokens inside the iframe.
    try {
      const invoice = deserialize(template.content);
      const baseHtml = renderInvoiceHtml(invoice);
      const tokenCss = `
        <style>
          body { background: #f8fafc; }
          .invoice-root { margin: 0 auto; box-shadow: 0 4px 16px rgba(15,23,42,0.08); }
          /* Highlight {{var}} tokens that survived into the rendered HTML. */
        </style>`;
      // The renderer emits a full document — inject our extra style before </head>.
      const html = baseHtml.includes('</head>')
        ? baseHtml.replace('</head>', `${tokenCss}</head>`)
        : `${tokenCss}${baseHtml}`;
      // Wrap each `{{token}}` in the body with a styled span. The renderer
      // escapes content, so the pattern matches `{{...}}` literally in the HTML.
      const highlighted = html.replace(
        /\{\{([a-zA-Z0-9_.]+)\}\}/g,
        '<span style="display:inline-block;padding:0 4px;border-radius:3px;background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe;font-size:0.85em;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">{{$1}}</span>',
      );
      return (
        <iframe
          title={`Aperçu — ${template.name}`}
          srcDoc={highlighted}
          sandbox=""
          className="w-full bg-white rounded-lg"
          style={{ height: 'calc(85vh - 130px)', border: 'none' }}
        />
      );
    } catch {
      return <div className="p-8 text-center text-slate-400 text-sm">Contenu invalide</div>;
    }
  }

  return <div className="p-8 text-center text-slate-400 text-sm">Aperçu non disponible</div>;
}

export function PreviewModal({
  template,
  onClose,
  onEdit,
}: {
  template: Template;
  onClose: () => void;
  onEdit: () => void;
}) {
  const config = getTypeConfig(template.type);
  const isContractOrInvoice = ['contrat', 'CONTRAT', 'facture', 'FACTURE'].includes(template.type);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[900px] h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
              <config.icon size={12} />
              {config.label}
            </span>
            <h3 className="text-sm font-semibold truncate">{template.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Pencil size={12} />
              Modifier
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
              <X size={16} className="text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className={`mx-auto shadow-sm rounded-lg overflow-hidden ${
            isContractOrInvoice ? 'max-w-[700px]' : 'max-w-[600px] bg-white'
          }`}>
            {isContractOrInvoice ? (
              <ModalContractInvoicePreview template={template} />
            ) : template.content ? (
              <div dangerouslySetInnerHTML={{ __html: mjmlToPreviewHtml(template.content) }} />
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm">Aucun contenu</div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
