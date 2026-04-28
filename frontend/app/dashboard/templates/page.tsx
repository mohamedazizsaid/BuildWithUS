'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mail, FileText, ScrollText, Pencil, Trash2, Copy, Eye, X, Clock, Star, Receipt, Play } from 'lucide-react';
import { templates } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { useSearch } from '@/context/search';
import toast from 'react-hot-toast';

type TabType = 'email' | 'contrat' | 'facture';

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  subject: string;
  content: string;
  created_at: string;
  updated_at: string;
  version: number;
  usage_count: number;
  is_favorite?: boolean;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string; bg: string; gradient: string }> = {
  EMAIL:   { label: 'Email',   icon: Mail,       color: 'text-blue-600',    bg: 'bg-blue-50',    gradient: 'from-blue-100 to-blue-50' },
  FACTURE: { label: 'Facture', icon: FileText,   color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-100 to-emerald-50' },
  CONTRAT: { label: 'Contrat', icon: ScrollText, color: 'text-amber-600',   bg: 'bg-amber-50',  gradient: 'from-amber-100 to-amber-50' },
  email:   { label: 'Email',   icon: Mail,       color: 'text-blue-600',    bg: 'bg-blue-50',    gradient: 'from-blue-100 to-blue-50' },
  facture: { label: 'Facture', icon: FileText,   color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-100 to-emerald-50' },
  contrat: { label: 'Contrat', icon: ScrollText, color: 'text-amber-600',   bg: 'bg-amber-50',  gradient: 'from-amber-100 to-amber-50' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG['EMAIL'];
}

function relativeTime(dateStr: string): string {
  if (!dateStr || dateStr === '0') return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    if (diffD < 30) return `Il y a ${Math.floor(diffD / 7)} sem.`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

// ─── MJML to HTML converter for preview ───
function mjmlToPreviewHtml(mjml: string): string {
  try {
    // Sanitize: replace content inside mj-text with placeholders to avoid XML parse errors
    const textContents: string[] = [];
    const sanitized = mjml.replace(/(<mj-text[^>]*>)([\s\S]*?)(<\/mj-text>)/g, (_m, open, content, close) => {
      textContents.push(content);
      return `${open}__PLACEHOLDER_${textContents.length - 1}__${close}`;
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'text/xml');
    if (doc.querySelector('parsererror')) return '';
    const body = doc.querySelector('mj-body');
    if (!body) return '';

    const bgColor = body.getAttribute('background-color') || '#ffffff';
    const width = body.getAttribute('width') || '600px';
    let html = `<div style="background-color:${bgColor};max-width:${width};margin:0 auto;font-family:Verdana,sans-serif;font-size:16px;color:#000;">`;

    const sections = body.querySelectorAll('mj-section');
    sections.forEach((section) => {
      const sBg = section.getAttribute('background-color') || 'transparent';
      const sPad = section.getAttribute('padding') || '10px 0';
      html += `<div style="background-color:${sBg};padding:${sPad};">`;
      html += `<div style="display:flex;">`;

      const cols = section.querySelectorAll('mj-column');
      const colCount = cols.length || 1;
      cols.forEach((col) => {
        const colW = col.getAttribute('width') || `${(100 / colCount).toFixed(1)}%`;
        html += `<div style="width:${colW};box-sizing:border-box;">`;

        for (const child of Array.from(col.children)) {
          const tag = child.tagName.toLowerCase();
          if (tag === 'mj-text') {
            const fs = child.getAttribute('font-size') || 'inherit';
            const fw = child.getAttribute('font-weight') || 'inherit';
            const ff = child.getAttribute('font-family') || 'inherit';
            const color = child.getAttribute('color') || 'inherit';
            const align = child.getAttribute('align') || 'left';
            const pad = child.getAttribute('padding') || '10px';
            const lh = child.getAttribute('line-height') || 'inherit';
            const ls = child.getAttribute('letter-spacing') || '0px';
            const bg = child.getAttribute('container-background-color');
            const bgStyle = bg ? `background-color:${bg};` : '';
            const cssClass = child.getAttribute('css-class') || '';
            const italic = cssClass.includes('italic') ? 'font-style:italic;' : '';
            const underline = cssClass.includes('underline') ? 'text-decoration:underline;' : '';
            // Restore original text content from placeholder
            let textContent = child.textContent || '';
            const phMatch = textContent.match(/__PLACEHOLDER_(\d+)__/);
            if (phMatch) {
              const idx = parseInt(phMatch[1]);
              textContent = textContents[idx] || textContent;
            }
            html += `<div style="${bgStyle}${italic}${underline}font-size:${fs};font-weight:${fw};font-family:${ff};color:${color};text-align:${align};padding:${pad};line-height:${lh};letter-spacing:${ls};">${textContent}</div>`;
          } else if (tag === 'mj-button') {
            const bgc = child.getAttribute('background-color') || '#0f172a';
            const c = child.getAttribute('color') || '#ffffff';
            const fs = child.getAttribute('font-size') || '16px';
            const br = child.getAttribute('border-radius') || '6px';
            const pad = child.getAttribute('padding') || '12px 24px';
            const align = child.getAttribute('align') || 'center';
            let btnText = child.textContent || '';
            const btnPhMatch = btnText.match(/__PLACEHOLDER_(\d+)__/);
            if (btnPhMatch) btnText = textContents[parseInt(btnPhMatch[1])] || btnText;
            html += `<div style="text-align:${align};padding:10px;"><span style="display:inline-block;background-color:${bgc};color:${c};font-size:${fs};padding:${pad};border-radius:${br};text-decoration:none;">${btnText}</span></div>`;
          } else if (tag === 'mj-image') {
            const src = child.getAttribute('src') || '';
            const alt = child.getAttribute('alt') || '';
            const w = child.getAttribute('width') || '100%';
            const pad = child.getAttribute('padding') || '10px';
            const br = child.getAttribute('border-radius') || '0px';
            const videoMatch = alt.match(/^video:(youtube|upload):(.+)$/);
            if (videoMatch) {
              const vType = videoMatch[1];
              const vSrc = videoMatch[2];
              const ytMatch = vSrc.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
              const ytId = ytMatch ? ytMatch[1] : null;
              if (vType === 'youtube' && ytId) {
                html += `<div style="text-align:center;padding:${pad};"><div style="position:relative;width:${w};max-width:100%;margin:0 auto;border-radius:${br};overflow:hidden;padding-bottom:56.25%;height:0"><iframe src="https://www.youtube.com/embed/${ytId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen></iframe></div></div>`;
              } else if (src) {
                html += `<div style="text-align:center;padding:${pad};"><div style="position:relative;width:${w};max-width:100%;margin:0 auto;border-radius:${br};overflow:hidden"><img src="${src}" style="width:100%;display:block" /><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3)"><div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-left:12px solid #0f172a;border-top:7px solid transparent;border-bottom:7px solid transparent;margin-left:2px"></div></div></div></div></div>`;
              } else {
                html += `<div style="text-align:center;padding:${pad};"><video src="${vSrc}" style="width:${w};max-width:100%;border-radius:${br}" controls></video></div>`;
              }
            } else if (src) {
              const imgAlign = child.getAttribute('align') || 'center';
              const imgMargin = imgAlign === 'center' ? 'margin:0 auto;' : imgAlign === 'right' ? 'margin-left:auto;' : '';
              const imgH = child.getAttribute('height') || 'auto';
              const imgHStyle = imgH !== 'auto' ? `height:${imgH};object-fit:cover;` : '';
              const imgBorder = child.getAttribute('border') || '';
              const imgBorderStyle = imgBorder ? `border:${imgBorder};` : '';
              const imgCircle = br === '50%' ? 'aspect-ratio:1/1;object-fit:cover;' : '';
              html += `<div style="padding:${pad};"><img src="${src}" style="display:block;width:${w};max-width:100%;border-radius:${br};${imgHStyle}${imgBorderStyle}${imgCircle}${imgMargin}" /></div>`;
            }
          } else if (tag === 'mj-divider') {
            const bc = child.getAttribute('border-color') || '#e2e8f0';
            const bw = child.getAttribute('border-width') || '1px';
            html += `<hr style="border:none;border-top:${bw} solid ${bc};margin:10px 0;" />`;
          } else if (tag === 'mj-table') {
            const tFs = child.getAttribute('font-size') || '13px';
            const tColor = child.getAttribute('color') || 'inherit';
            // Restore table content from placeholder if needed
            let tableHtml = child.innerHTML || '';
            const tPhMatch = tableHtml.match(/__PLACEHOLDER_(\d+)__/);
            if (tPhMatch) {
              tableHtml = textContents[parseInt(tPhMatch[1])] || tableHtml;
            }
            html += `<table style="width:100%;border-collapse:collapse;font-size:${tFs};color:${tColor};padding:10px;">${tableHtml}</table>`;
          }
        }
        html += `</div>`;
      });
      html += `</div></div>`;
    });
    html += `</div>`;
    return html;
  } catch {
    return '';
  }
}

// ─── Contract card preview ───
function ContractPreview({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    const blocks: { type: string; content: string }[] = data.blocks || [];
    const heading = blocks.find((b) => b.type === 'contract_header' || b.type === 'heading');
    const articles = blocks.filter((b) => b.type === 'article' || b.type === 'legal_article').slice(0, 3);
    const contractType = data.contractType || 'b2c';
    const typeLabels: Record<string, string> = { b2c: 'B2C', b2b: 'B2B', web: 'Web', aop: 'AOP', abonnement: 'Abonnement' };

    const title = heading?.content
      ?.split('\n')[0]
      ?.replaceAll(/\{\{[\w]+\}\}/g, '...')
      ?.substring(0, 40) || 'Contrat';

    return (
      <div className="w-full h-[180px] bg-[#0f172a] relative overflow-hidden flex flex-col p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Document légal</span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
            {typeLabels[contractType] || contractType.toUpperCase()}
          </span>
        </div>
        <div className="text-white text-[11px] font-bold leading-tight mb-3 line-clamp-2">{title}</div>
        <div className="flex flex-col gap-1.5 flex-1">
          {articles.map((_a, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-white/10 flex items-center justify-center shrink-0">
                <span className="text-[7px] text-white/40 font-bold">{i + 1}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full flex-1" style={{ width: `${60 + i * 10}%` }} />
            </div>
          ))}
          {articles.length === 0 && (
            <div className="flex flex-col gap-1.5">
              {[80, 65, 75, 55].map((w, i) => (
                <div key={i} className="h-1.5 bg-white/10 rounded-full" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0f172a] to-transparent" />
      </div>
    );
  } catch {
    return (
      <div className="w-full h-[180px] bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
        <ScrollText size={32} className="text-amber-400 opacity-40" />
      </div>
    );
  }
}

// ─── Invoice card preview ───
function InvoicePreview({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    const typeLabels: Record<string, string> = {
      standard: 'Standard', 'pro-forma': 'Pro-forma',
      acompte: 'Acompte', solde: 'Solde', avoir: 'Avoir', recurrente: 'Récurrente',
    };
    const lines: { description: string; quantity: number; unitPrice: number }[] = data.lines || [];
    const subtotalHT = lines.reduce((s, l) => s + (l.quantity || 1) * (l.unitPrice || 0), 0);
    const tva = subtotalHT * ((data.tvaRate || 20) / 100);
    const ttc = subtotalHT + tva;
    const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
      <div className="w-full h-[180px] bg-white relative overflow-hidden p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="text-[13px] font-black text-slate-900">FACTURE</div>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              {typeLabels[data.invoiceType] || 'Standard'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-700">{data.invoiceNumber || 'F2026-001'}</div>
            <div className="text-[9px] text-slate-400">{data.issueDate || ''}</div>
          </div>
        </div>
        <div className="h-px bg-slate-900 mb-2" />
        {data.clientName && (
          <div className="text-[9px] text-slate-500 mb-2 truncate">
            <span className="font-semibold text-slate-700">{data.clientName}</span>
          </div>
        )}
        <div className="flex flex-col gap-1 mb-2">
          {lines.slice(0, 2).map((l, i) => (
            <div key={i} className="flex justify-between text-[9px]">
              <span className="text-slate-500 truncate flex-1">{l.description || '—'}</span>
              <span className="text-slate-700 font-medium ml-2">{fmt(l.quantity * l.unitPrice)} €</span>
            </div>
          ))}
        </div>
        {ttc > 0 && (
          <div className="absolute bottom-3 right-3 bg-slate-900 text-white px-2 py-1 rounded-md text-[10px] font-bold">
            {fmt(ttc)} € TTC
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
      </div>
    );
  } catch {
    return (
      <div className="w-full h-[180px] bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
        <FileText size={32} className="text-emerald-400 opacity-40" />
      </div>
    );
  }
}

// ─── Template Preview (mini render) ───
function TemplatePreview({ content, type }: { content: string; type: string }) {
  const config = getTypeConfig(type);
  const Icon = config.icon;

  const previewHtml = content ? mjmlToPreviewHtml(content) : '';

  if (previewHtml) {
    return (
      <div className="w-full h-[180px] overflow-hidden bg-white relative">
        <div
          className="origin-top-left absolute top-0 left-0"
          style={{ transform: 'scale(0.45)', width: '222%', height: '222%', pointerEvents: 'none' }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className={`w-full h-[180px] bg-gradient-to-br ${config.gradient} flex flex-col items-center justify-center gap-3`}>
      <Icon size={32} className={`${config.color} opacity-40`} />
      <div className="space-y-1.5 w-2/3">
        <div className={`h-2 rounded-full ${config.bg} opacity-60`} />
        <div className={`h-2 rounded-full ${config.bg} opacity-40 w-3/4`} />
        <div className={`h-2 rounded-full ${config.bg} opacity-30 w-1/2`} />
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ───
function DeleteModal({
  template,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  template: Template;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-center mb-2">Supprimer le modèle ?</h3>
        <p className="text-sm text-slate-500 text-center mb-6">
          Cette action est irréversible. Le modèle <strong>&ldquo;{template.name}&rdquo;</strong> sera définitivement supprimé.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 size={14} />
                Supprimer
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Full contract / invoice preview (inside modal) ──────────────────────────
function ModalContractInvoicePreview({ template }: { template: Template }) {
  const type = template.type?.toLowerCase();

  if (type === 'contrat') {
    try {
      const data = JSON.parse(template.content);
      const blocks: { type: string; content: string }[] = data.blocks || [];
      const contractLabels: Record<string, string> = {
        b2c: 'B2C — Particulier', b2b: 'B2B — Entreprise',
        web: 'Web / E-commerce', aop: "Appel d'Offre Public", abonnement: 'Abonnement',
      };

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
    try {
      const d = JSON.parse(template.content);
      const lines: { id: string; description: string; quantity: number; unitPrice: number }[] = d.lines || [];
      const subtotalHT = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
      const tva = subtotalHT * ((d.tvaRate || 20) / 100);
      const ttc = subtotalHT + tva;
      const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const typeLabels: Record<string, string> = { standard: 'Standard', 'pro-forma': 'Pro-forma', acompte: 'Acompte', solde: 'Solde', avoir: 'Avoir', recurrente: 'Récurrente' };

      return (
        <div className="bg-white rounded-lg shadow-sm p-6" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">FACTURE</div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{typeLabels[d.invoiceType] || 'Standard'}</span>
            </div>
            <div className="text-right text-sm">
              <div className="font-bold text-slate-900">{d.invoiceNumber || '—'}</div>
              <div className="text-slate-400 text-xs">Date : {d.issueDate || '—'}</div>
              <div className="text-slate-400 text-xs">Échéance : {d.dueDate || '—'}</div>
            </div>
          </div>
          <div className="h-0.5 bg-slate-900 mb-4" />
          {d.clientName && (
            <div className="mb-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Facturé à</div>
              <div className="font-bold text-sm">{d.clientName}</div>
              {d.clientEmail && <div className="text-xs text-slate-500">{d.clientEmail}</div>}
              {d.clientAddress && <div className="text-xs text-slate-500">{d.clientAddress}</div>}
            </div>
          )}
          {/* Lines */}
          <table className="w-full mb-4" style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left p-2 font-semibold rounded-tl">Description</th>
                <th className="text-center p-2 font-semibold w-12">Qté</th>
                <th className="text-right p-2 font-semibold w-20">PU HT</th>
                <th className="text-right p-2 font-semibold w-20 rounded-tr">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0
                ? <tr><td colSpan={4} className="p-3 text-center text-slate-400 italic">Aucune ligne</td></tr>
                : lines.map((l, i) => (
                  <tr key={l.id} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="p-2">{l.description || '—'}</td>
                    <td className="p-2 text-center">{l.quantity}</td>
                    <td className="p-2 text-right">{fmt(l.unitPrice)} €</td>
                    <td className="p-2 text-right font-medium">{fmt(l.quantity * l.unitPrice)} €</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-52 text-xs">
              <div className="flex justify-between py-1 text-slate-500"><span>Sous-total HT</span><span>{fmt(subtotalHT)} €</span></div>
              <div className="flex justify-between py-1 text-slate-500"><span>TVA ({d.tvaRate || 20}%)</span><span>{fmt(tva)} €</span></div>
              <div className="flex justify-between py-2 px-3 bg-slate-900 text-white rounded mt-1 font-bold text-sm">
                <span>Total TTC</span><span>{fmt(ttc)} €</span>
              </div>
            </div>
          </div>
          {d.notes && <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">{d.notes}</div>}
        </div>
      );
    } catch {
      return <div className="p-8 text-center text-slate-400 text-sm">Contenu invalide</div>;
    }
  }

  return <div className="p-8 text-center text-slate-400 text-sm">Aperçu non disponible</div>;
}

// ─── Full Preview Modal ───
function PreviewModal({
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
        {/* Header */}
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
        {/* Body */}
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

// ─── Tab config ───
const TABS: { key: TabType; label: string; icon: typeof Mail; newRoute: string }[] = [
  { key: 'email',   label: 'Emails',   icon: Mail,       newRoute: '/dashboard/templates/new?preselect=email'   },
  { key: 'contrat', label: 'Contrats', icon: ScrollText, newRoute: '/dashboard/templates/new?preselect=contrat' },
  { key: 'facture', label: 'Factures', icon: Receipt,    newRoute: '/dashboard/templates/new?preselect=facture' },
];

const TAB_TYPES: Record<TabType, string[]> = {
  email:   ['email', 'EMAIL'],
  contrat: ['contrat', 'CONTRAT'],
  facture: ['facture', 'FACTURE'],
};

// ─── Main Page ───
export default function TemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('email');
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<Template | null>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const { query } = useSearch();

  // Filter by tab first, then by search query
  const tabFiltered = templateList.filter((t) => TAB_TYPES[activeTab].includes(t.type));
  const filteredTemplates = query.trim()
    ? tabFiltered.filter((t) => {
        const q = query.toLowerCase();
        return (
          t.name?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q) ||
          t.type?.toLowerCase().includes(q)
        );
      })
    : tabFiltered;

  // Counts per tab for badges
  const counts: Record<TabType, number> = {
    email:   templateList.filter((t) => TAB_TYPES.email.includes(t.type)).length,
    contrat: templateList.filter((t) => TAB_TYPES.contrat.includes(t.type)).length,
    facture: templateList.filter((t) => TAB_TYPES.facture.includes(t.type)).length,
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templates.list({ page: 1, limit: 100 });
      setTemplateList(data.templates || []);
    } catch {
      toast.error('Échec du chargement des modèles');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tmpl: Template) => {
    const type = tmpl.type?.toLowerCase();
    const params = new URLSearchParams({ id: tmpl.id, name: tmpl.name, description: tmpl.description || '' });
    if (type === 'contrat') {
      router.push(`/dashboard/templates/contract-editor?${params.toString()}&type=3`);
    } else if (type === 'facture') {
      router.push(`/dashboard/templates/invoice-editor?${params.toString()}&type=2`);
    } else {
      router.push(`/dashboard/templates/editor?id=${tmpl.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await templates.delete(deleteTarget.id);
      setTemplateList((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success('Modèle supprimé');
    } catch {
      toast.error('Échec de la suppression');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleFavorite = async (tmpl: Template) => {
    const next = !tmpl.is_favorite;
    // Optimistic update
    setTemplateList((prev) =>
      prev.map((t) => (t.id === tmpl.id ? { ...t, is_favorite: next } : t)),
    );
    try {
      await templates.toggleFavorite(tmpl.id, next);
      toast.success(next ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch {
      // Rollback on failure
      setTemplateList((prev) =>
        prev.map((t) => (t.id === tmpl.id ? { ...t, is_favorite: !next } : t)),
      );
      toast.error('Échec de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeTabCfg = TABS.find((t) => t.key === activeTab)!;
  const TabIcon = activeTabCfg.icon;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Modèles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filteredTemplates.length} modèle{filteredTemplates.length !== 1 ? 's' : ''}{query.trim() ? ` pour "${query}"` : ''}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => router.push('/dashboard/templates/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nouveau modèle
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={14} />
            {label}
            {counts[key] > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                activeTab === key ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'
              }`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <TabIcon size={24} className="text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">{query.trim() ? 'Aucun résultat' : `Aucun ${activeTabCfg.label.toLowerCase().slice(0, -1)}`}</p>
          <p className="text-muted-foreground text-sm mb-6">
            {query.trim()
              ? `Aucun modèle ne correspond à "${query}"`
              : `Créez votre premier modèle ${activeTabCfg.label.toLowerCase().slice(0, -1)} pour commencer`}
          </p>
          {!query.trim() && canEdit && (
            <button
              onClick={() => router.push('/dashboard/templates/new')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-xl hover:bg-primary/90 shadow-sm"
            >
              <Plus size={16} />
              Créer un modèle
            </button>
          )}
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filteredTemplates.map((tmpl, i) => {
              const config = getTypeConfig(tmpl.type);
              const Icon = config.icon;
              const isContract = tmpl.type?.toLowerCase() === 'contrat';
              const isInvoice = tmpl.type?.toLowerCase() === 'facture';

              return (
                <motion.div
                  key={tmpl.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Preview Area */}
                  <div className="relative">
                    {isContract ? (
                      <ContractPreview content={tmpl.content} />
                    ) : isInvoice ? (
                      <InvoicePreview content={tmpl.content} />
                    ) : (
                      <TemplatePreview content={tmpl.content} type={tmpl.type} />
                    )}

                    {/* Hover overlay + preview pill */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center">
                      <button
                        onClick={() => setPreviewTarget(tmpl)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-slate-700 shadow-md hover:bg-slate-50 transition-all duration-150 hover:scale-105"
                      >
                        <Eye size={13} />
                        Aperçu
                      </button>
                    </div>

                    {/* Type badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color}`}>
                        <Icon size={9} />
                        {config.label}
                      </span>
                    </div>

                    {/* Star */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(tmpl); }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                      title={tmpl.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <Star
                        size={13}
                        className={tmpl.is_favorite ? 'text-amber-400' : 'text-slate-300'}
                        fill={tmpl.is_favorite ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  {/* Colored accent line */}
                  <div className={`h-[2px] bg-gradient-to-r ${config.gradient}`} />

                  {/* Card Info */}
                  <div className="p-3.5">
                    <h3 className="text-sm font-semibold truncate text-foreground">{tmpl.name}</h3>
                    {tmpl.description && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tmpl.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock size={10} />
                        <span className="text-[10px]">{relativeTime(tmpl.updated_at || tmpl.created_at)}</span>
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Generate button — contracts & invoices only */}
                          {(isContract || isInvoice) && (
                            <button
                              onClick={() => router.push(`/dashboard/templates/generate?id=${tmpl.id}&name=${encodeURIComponent(tmpl.name)}`)}
                              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-emerald-50 transition-colors"
                              title="Générer un document"
                            >
                              <Play size={11} className="text-emerald-500" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(tmpl)}
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                            title="Modifier"
                          >
                            <Pencil size={12} className="text-muted-foreground" />
                          </button>
                          <button
                            className="w-6 h-6 rounded-md flex items-center justify-center opacity-30 cursor-not-allowed"
                            title="Bientôt disponible"
                          >
                            <Copy size={12} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(tmpl)}
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={12} className="text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            template={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTarget && (
          <PreviewModal
            template={previewTarget}
            onClose={() => setPreviewTarget(null)}
            onEdit={() => {
              const t = previewTarget;
              setPreviewTarget(null);
              if (t) handleEdit(t);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
