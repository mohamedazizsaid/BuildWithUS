'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, FileText, ScrollText, Pencil, Eye, Clock, Star } from 'lucide-react';
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

function mjmlToPreviewHtml(mjml: string): string {
  try {
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
      html += `<div style="background-color:${sBg};padding:${sPad};"><div style="display:flex;">`;

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
            const color = child.getAttribute('color') || 'inherit';
            const align = child.getAttribute('align') || 'left';
            const pad = child.getAttribute('padding') || '10px';
            let textContent = child.textContent || '';
            const phMatch = textContent.match(/__PLACEHOLDER_(\d+)__/);
            if (phMatch) textContent = textContents[parseInt(phMatch[1])] || textContent;
            html += `<div style="font-size:${fs};font-weight:${fw};color:${color};text-align:${align};padding:${pad};">${textContent}</div>`;
          } else if (tag === 'mj-button') {
            const bgc = child.getAttribute('background-color') || '#0f172a';
            const c = child.getAttribute('color') || '#ffffff';
            const fs = child.getAttribute('font-size') || '16px';
            const br = child.getAttribute('border-radius') || '6px';
            const pad = child.getAttribute('padding') || '12px 24px';
            const align = child.getAttribute('align') || 'center';
            let btnText = child.textContent || '';
            const btnPh = btnText.match(/__PLACEHOLDER_(\d+)__/);
            if (btnPh) btnText = textContents[parseInt(btnPh[1])] || btnText;
            html += `<div style="text-align:${align};padding:10px;"><span style="display:inline-block;background-color:${bgc};color:${c};font-size:${fs};padding:${pad};border-radius:${br};">${btnText}</span></div>`;
          } else if (tag === 'mj-image') {
            const src = child.getAttribute('src') || '';
            const w = child.getAttribute('width') || '100%';
            const pad = child.getAttribute('padding') || '10px';
            const br = child.getAttribute('border-radius') || '0px';
            if (src) {
              html += `<div style="padding:${pad};"><img src="${src}" style="display:block;width:${w};max-width:100%;border-radius:${br};" /></div>`;
            }
          } else if (tag === 'mj-divider') {
            const bc = child.getAttribute('border-color') || '#e2e8f0';
            const bw = child.getAttribute('border-width') || '1px';
            html += `<hr style="border:none;border-top:${bw} solid ${bc};margin:10px 0;" />`;
          } else if (tag === 'mj-table') {
            const tFs = child.getAttribute('font-size') || '13px';
            const tColor = child.getAttribute('color') || 'inherit';
            let tableHtml = child.innerHTML || '';
            const tPh = tableHtml.match(/__PLACEHOLDER_(\d+)__/);
            if (tPh) tableHtml = textContents[parseInt(tPh[1])] || tableHtml;
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

export default function FavouritesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const canEdit = user?.role === 'admin' || user?.role === 'editor' || user?.role === 'marketing';

  useEffect(() => {
    loadFavourites();
  }, []);

  const loadFavourites = async () => {
    try {
      const data = await templates.list({ page: 1, limit: 50, favoritesOnly: true });
      setTemplateList(data.templates || []);
    } catch {
      toast.error('Échec du chargement des favoris');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/templates/editor?id=${id}`);
  };

  const handleUnfavorite = async (tmpl: Template) => {
    // Optimistic: remove from list
    setTemplateList((prev) => prev.filter((t) => t.id !== tmpl.id));
    try {
      await templates.toggleFavorite(tmpl.id, false);
      toast.success('Retiré des favoris');
    } catch {
      // Rollback — put it back
      setTemplateList((prev) => [...prev, { ...tmpl, is_favorite: true }]);
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star size={22} className="text-amber-500" fill="currentColor" />
            Favoris
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {templateList.length} modèle{templateList.length !== 1 ? 's' : ''} favori{templateList.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Empty State */}
      {templateList.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
            <Star size={24} className="text-amber-500" />
          </div>
          <p className="font-medium mb-1">Aucun favori</p>
          <p className="text-muted-foreground text-sm mb-6">
            Marquez vos modèles préférés depuis la liste des modèles
          </p>
          <button
            onClick={() => router.push('/dashboard/templates')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-xl hover:bg-primary/90 shadow-sm"
          >
            Voir les modèles
          </button>
        </motion.div>
      ) : (
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
                className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Preview */}
                <div className="relative">
                  <TemplatePreview content={tmpl.content} type={tmpl.type} />

                  {/* Subtle hover overlay + open pill */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center">
                    <button
                      onClick={() => handleEdit(tmpl.id)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-slate-700 shadow-md hover:bg-slate-50 transition-all duration-150 hover:scale-105"
                      title="Ouvrir"
                    >
                      <Eye size={13} />
                      Ouvrir
                    </button>
                  </div>

                  {/* Type badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color}`}>
                      <Icon size={9} />
                      {config.label}
                    </span>
                  </div>

                  {/* Unfavorite star */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnfavorite(tmpl); }}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                    title="Retirer des favoris"
                  >
                    <Star size={13} className="text-amber-400" fill="currentColor" />
                  </button>
                </div>

                {/* Colored accent line */}
                <div className={`h-0.5 bg-gradient-to-r ${config.gradient}`} />

                {/* Info */}
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
                      <button
                        onClick={() => handleEdit(tmpl.id)}
                        className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                        title="Modifier"
                      >
                        <Pencil size={12} className="text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
