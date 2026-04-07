'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mail, FileText, ScrollText, Pencil, Trash2, Copy, Eye, X, Clock } from 'lucide-react';
import { templates } from '@/lib/api';
import { useAuth } from '@/context/auth';
import toast from 'react-hot-toast';

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
          <div className="max-w-[600px] mx-auto bg-white shadow-sm rounded-lg overflow-hidden">
            {template.content ? (
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

// ─── Main Page ───
export default function TemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<Template | null>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templates.list({ page: 1, limit: 50 });
      setTemplateList(data.templates || []);
    } catch {
      toast.error('Échec du chargement des modèles');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/templates/editor?id=${id}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Modèles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {templateList.length} modèle{templateList.length !== 1 ? 's' : ''}
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

      {/* Empty State */}
      {templateList.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Mail size={24} className="text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">Aucun modèle</p>
          <p className="text-muted-foreground text-sm mb-6">Créez votre premier modèle pour commencer</p>
          {canEdit && (
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
        /* Template Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {templateList.map((tmpl, i) => {
            const config = getTypeConfig(tmpl.type);
            const Icon = config.icon;

            return (
              <motion.div
                key={tmpl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300"
              >
                {/* Preview Area */}
                <div className="relative">
                  <TemplatePreview content={tmpl.content} type={tmpl.type} />

                  {/* Hover overlay with preview button */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <button
                      onClick={() => setPreviewTarget(tmpl)}
                      className="opacity-0 group-hover:opacity-100 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 hover:scale-110"
                    >
                      <Eye size={18} className="text-slate-700" />
                    </button>
                  </div>

                  {/* Type badge overlay */}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.bg} ${config.color} backdrop-blur-sm`}>
                      <Icon size={10} />
                      {config.label}
                    </span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold truncate mb-0.5">{tmpl.name}</h3>
                  {tmpl.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{tmpl.description}</p>
                  )}
                  {!tmpl.description && <div className="mb-3" />}

                  {/* Footer: time + actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock size={11} />
                      <span className="text-[11px]">{relativeTime(tmpl.updated_at || tmpl.created_at)}</span>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(tmpl.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={13} className="text-muted-foreground" />
                        </button>
                        <button
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors opacity-40 cursor-not-allowed"
                          title="Bientôt disponible"
                        >
                          <Copy size={13} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tmpl)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={13} className="text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
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
              setPreviewTarget(null);
              handleEdit(previewTarget.id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
