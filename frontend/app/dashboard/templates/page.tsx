'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mail, Pencil, Trash2, Copy, Eye, Clock, Star, Play, Layers } from 'lucide-react';
import { PREDEFINED_TEMPLATES } from '@/lib/predefined-templates';
import { templates } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { useSearch } from '@/context/search';
import toast from 'react-hot-toast';

import {
  TABS, TAB_TYPES, getTypeConfig,
  type TabType, type ViewMode, type Template,
} from './_lib/types';
import { relativeTime } from './_lib/preview-helpers';
import { ContractPreview } from './_components/ContractPreview';
import { InvoicePreview } from './_components/InvoicePreview';
import { TemplatePreview } from './_components/TemplatePreview';
import { DeleteModal } from './_components/DeleteModal';
import { PreviewModal } from './_components/PreviewModal';
import { PredefinedGallery } from './_components/PredefinedGallery';

function TemplatesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const initialView = (searchParams.get('view') as ViewMode | null);
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialView === 'predifinis' || initialView === 'favoris' ? initialView : 'modeles',
  );
  const [activeTab, setActiveTab] = useState<TabType>('email');
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<Template | null>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const { query } = useSearch();

  const viewFiltered = viewMode === 'favoris'
    ? templateList.filter(t => t.is_favorite)
    : templateList;

  const tabFiltered = viewFiltered.filter((t) => TAB_TYPES[activeTab].includes(t.type));
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

  const counts: Record<TabType, number> = {
    email:   viewFiltered.filter((t) => TAB_TYPES.email.includes(t.type)).length,
    contrat: viewFiltered.filter((t) => TAB_TYPES.contrat.includes(t.type)).length,
    facture: viewFiltered.filter((t) => TAB_TYPES.facture.includes(t.type)).length,
  };

  const handleUsePreset = (presetId: string, presetName: string) => {
    router.push(`/dashboard/templates/editor?preset=${presetId}&name=${encodeURIComponent(presetName)}&type=1`);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const regular = await templates.list({ page: 1, limit: 100 });
      setTemplateList(regular.templates || []);
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
    setTemplateList((prev) =>
      prev.map((t) => (t.id === tmpl.id ? { ...t, is_favorite: next } : t)),
    );
    try {
      await templates.toggleFavorite(tmpl.id, next);
      toast.success(next ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Modèles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {viewMode === 'predifinis'
              ? `${PREDEFINED_TEMPLATES.length} templates prêts à utiliser`
              : `${filteredTemplates.length} modèle${filteredTemplates.length !== 1 ? 's' : ''}${query.trim() ? ` pour "${query}"` : ''}`}
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

      <div className="flex items-center gap-1 mb-4 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { key: 'modeles',   label: 'Mes modèles',          icon: Mail   },
          { key: 'favoris',   label: 'Favoris',               icon: Star   },
          { key: 'predifinis', label: 'Templates prédéfinis', icon: Layers },
        ] as { key: ViewMode; label: string; icon: typeof Mail }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={14} />
            {label}
            {key === 'predifinis' && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${viewMode === key ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'}`}>
                {PREDEFINED_TEMPLATES.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {viewMode === 'predifinis' ? (
        <PredefinedGallery onUse={handleUsePreset} />
      ) : (
        <>
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
                  <div className="relative">
                    {isContract ? (
                      <ContractPreview content={tmpl.content} />
                    ) : isInvoice ? (
                      <InvoicePreview content={tmpl.content} />
                    ) : (
                      <TemplatePreview content={tmpl.content} type={tmpl.type} />
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center">
                      <button
                        onClick={() => setPreviewTarget(tmpl)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-slate-700 shadow-md hover:bg-slate-50 transition-all duration-150 hover:scale-105"
                      >
                        <Eye size={13} />
                        Aperçu
                      </button>
                    </div>

                    <div className="absolute top-2.5 left-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color}`}>
                        <Icon size={9} />
                        {config.label}
                      </span>
                    </div>

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

                  <div className={`h-[2px] bg-gradient-to-r ${config.gradient}`} />

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
        </>
      )}

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

export default function TemplatesPage() {
  return (
    <Suspense fallback={null}>
      <TemplatesPageInner />
    </Suspense>
  );
}
