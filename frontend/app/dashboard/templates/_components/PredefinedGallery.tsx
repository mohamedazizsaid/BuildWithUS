'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, X, Pencil, Trash2, Sparkles } from 'lucide-react';
import { PREDEFINED_TEMPLATES, PREDEFINED_CATEGORIES, CATEGORY_STYLES, type PredefinedTemplate } from '@/lib/predefined-templates';
import { renderRowsPreview } from '@/lib/preview-html';
import { mjmlToPreviewHtml } from '../_lib/preview-helpers';
import { templates } from '@/lib/api';
import { useAuth } from '@/context/auth';
import toast from 'react-hot-toast';

// A tenant predefined entry created by the marketing team. The category id is
// stored in `predefined_template_id` (see editor save flow + gateway).
type CustomPredefined = {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
};

function categoryLabel(id: string): string {
  return PREDEFINED_CATEGORIES.find(c => c.id === id)?.label ?? id;
}

function ThumbnailFromHtml({ html }: { html: string }) {
  return (
    <div className="w-full h-[200px] overflow-hidden bg-white relative">
      <div
        className="origin-top-left absolute top-0 left-0"
        style={{ transform: 'scale(0.45)', width: '222%', height: '222%', pointerEvents: 'none' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80 pointer-events-none" />
    </div>
  );
}

function PreviewModal({
  name,
  description,
  categoryId,
  html,
  onClose,
  onUse,
}: {
  name: string;
  description: string;
  categoryId: string;
  html: string;
  onClose: () => void;
  onUse: () => void;
}) {
  const style = CATEGORY_STYLES[categoryId] || CATEGORY_STYLES.b2b;
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
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
              style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.accent}22` }}
            >
              {categoryLabel(categoryId)}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{name}</h3>
              <p className="text-[11px] text-muted-foreground truncate">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onUse}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus size={12} />
              Utiliser ce template
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
              <X size={16} className="text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="mx-auto shadow-sm rounded-lg overflow-hidden max-w-[600px] bg-white">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function PredefinedGallery({
  onUse,
}: {
  onUse: (id: string, name: string) => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const isMarketing = user?.role === 'marketing';

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [custom, setCustom] = useState<CustomPredefined[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<CustomPredefined | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // "Create predefined" dialog: collects a title (+ a category when launched from "Tous").
  const [createOpen, setCreateOpen] = useState(false);
  const [createFromAll, setCreateFromAll] = useState(false);
  const [createCategory, setCreateCategory] = useState('marketing');
  const [createName, setCreateName] = useState('');
  // Preview can target either a built-in or a custom template — normalize to html.
  const [preview, setPreview] = useState<{ name: string; description: string; categoryId: string; html: string; onUse: () => void } | null>(null);

  const loadCustom = useCallback(async () => {
    try {
      const res = await templates.list({ predefinedOverridesOnly: true, limit: 100 });
      const list: CustomPredefined[] = (res.templates || []).map((t: {
        id: string; name: string; description?: string; content?: string; predefined_template_id?: string;
      }) => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        category: t.predefined_template_id || 'b2b',
        content: t.content || '',
      }));
      setCustom(list);
    } catch {
      // Non-fatal: built-in gallery still renders.
    }
  }, []);

  useEffect(() => {
    loadCustom();
  }, [loadCustom]);

  const builtinFor = (catId: string) =>
    catId === 'all' ? PREDEFINED_TEMPLATES : PREDEFINED_TEMPLATES.filter(t => t.category === catId);
  const customFor = (catId: string) =>
    catId === 'all' ? custom : custom.filter(t => t.category === catId);

  const countFor = (catId: string) => builtinFor(catId).length + customFor(catId).length;

  const REAL_CATEGORIES = PREDEFINED_CATEGORIES.filter(c => c.id !== 'all');

  const openCreate = () => {
    const fromAll = selectedCategory === 'all';
    setCreateFromAll(fromAll);
    setCreateCategory(fromAll ? REAL_CATEGORIES[0].id : selectedCategory);
    setCreateName('');
    setCreateOpen(true);
  };

  const submitCreate = () => {
    const name = createName.trim();
    if (!name) {
      toast.error('Donnez un titre au template');
      return;
    }
    const params = new URLSearchParams({
      predefinedCategory: createCategory,
      type: '1',
      from: 'predifinis',
      name,
    });
    setCreateOpen(false);
    router.push(`/dashboard/templates/editor?${params.toString()}`);
  };

  const handleUseCustom = (t: CustomPredefined) => {
    router.push(`/dashboard/templates/editor?cloneFrom=${encodeURIComponent(t.id)}`);
  };

  const handleEditCustom = (t: CustomPredefined) => {
    router.push(`/dashboard/templates/editor?id=${encodeURIComponent(t.id)}&from=predifinis`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await templates.delete(deleteTarget.id);
      setCustom(prev => prev.filter(t => t.id !== deleteTarget.id));
      toast.success('Template prédéfini supprimé');
    } catch {
      toast.error('Échec de la suppression');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const previewBuiltin = (tmpl: PredefinedTemplate) => {
    setPreview({
      name: tmpl.name,
      description: tmpl.description,
      categoryId: tmpl.category,
      html: renderRowsPreview(tmpl.rows()),
      onUse: () => { setPreview(null); onUse(tmpl.id, tmpl.name); },
    });
  };

  const previewCustom = (t: CustomPredefined) => {
    setPreview({
      name: t.name,
      description: t.description,
      categoryId: t.category,
      html: mjmlToPreviewHtml(t.content),
      onUse: () => { setPreview(null); handleUseCustom(t); },
    });
  };

  const builtins = builtinFor(selectedCategory);
  const customs = customFor(selectedCategory);
  const showCreateTile = isMarketing;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {PREDEFINED_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
              {cat.id !== 'all' && (
                <span className={`ml-1.5 text-[10px] font-semibold ${selectedCategory === cat.id ? 'text-white/70' : 'text-slate-400'}`}>
                  {countFor(cat.id)}
                </span>
              )}
            </button>
          ))}
        </div>

        {isMarketing && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            title={selectedCategory === 'all' ? 'Créer un modèle prédéfini' : `Créer un modèle dans « ${categoryLabel(selectedCategory)} »`}
          >
            <Sparkles size={15} />
            {selectedCategory === 'all' ? 'Créer un modèle prédéfini' : `Créer dans « ${categoryLabel(selectedCategory)} »`}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCategory}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {showCreateTile && (
            <button
              onClick={openCreate}
              className="group flex flex-col items-center justify-center gap-2 min-h-[280px] rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                <Plus size={22} />
              </div>
              <span className="text-sm font-medium">Créer un modèle</span>
              <span className="text-[11px] text-slate-400">
                {selectedCategory === 'all' ? 'choisir une catégorie' : `dans « ${categoryLabel(selectedCategory)} »`}
              </span>
            </button>
          )}

          {/* Tenant predefined entries (created by marketing) */}
          {customs.map((t, i) => {
            const style = CATEGORY_STYLES[t.category] || CATEGORY_STYLES.b2b;
            const html = mjmlToPreviewHtml(t.content);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="relative">
                  {html ? <ThumbnailFromHtml html={html} /> : (
                    <div className="w-full h-[200px] bg-slate-50 flex items-center justify-center text-slate-300">
                      <Sparkles size={28} />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-200 flex items-center justify-center gap-2">
                    <button
                      onClick={() => previewCustom(t)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 rounded-full text-xs font-semibold shadow-lg transition-all duration-150 hover:scale-105 hover:bg-slate-50"
                    >
                      <Eye size={12} />
                      Aperçu
                    </button>
                    <button
                      onClick={() => handleUseCustom(t)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-full text-xs font-semibold shadow-lg transition-all duration-150 hover:scale-105"
                    >
                      <Plus size={12} />
                      Utiliser
                    </button>
                  </div>

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm" style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.accent}22` }}>
                      {categoryLabel(t.category)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm bg-white/90 text-slate-500">
                      Maison
                    </span>
                  </div>

                  {isMarketing && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditCustom(t); }}
                        className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                        title="Modifier"
                      >
                        <Pencil size={12} className="text-slate-600" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}
                        className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                        title="Supprimer"
                      >
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-[2px]" style={{ backgroundColor: style.accent, opacity: 0.4 }} />

                <div className="p-3.5">
                  <h3 className="text-sm font-semibold truncate text-foreground">{t.name}</h3>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{t.description || 'Template prédéfini de votre équipe'}</p>
                  <button
                    onClick={() => handleUseCustom(t)}
                    className="mt-3 w-full h-8 rounded-lg border border-border text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={12} />
                    Utiliser le template
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* Built-in gallery */}
          {builtins.map((tmpl, i) => {
            const style = CATEGORY_STYLES[tmpl.category] || CATEGORY_STYLES.b2b;
            const handleUse = () => onUse(tmpl.id, tmpl.name);

            return (
              <motion.div
                key={tmpl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (customs.length + i) * 0.04, duration: 0.3 }}
                className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="relative">
                  <ThumbnailFromHtml html={renderRowsPreview(tmpl.rows())} />

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-200 flex items-center justify-center gap-2">
                    <button
                      onClick={() => previewBuiltin(tmpl)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 rounded-full text-xs font-semibold shadow-lg transition-all duration-150 hover:scale-105 hover:bg-slate-50"
                    >
                      <Eye size={12} />
                      Aperçu
                    </button>
                    <button
                      onClick={handleUse}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-full text-xs font-semibold shadow-lg transition-all duration-150 hover:scale-105"
                    >
                      <Eye size={12} />
                      Ouvrir
                    </button>
                  </div>

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm" style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.accent}22` }}>
                      {categoryLabel(tmpl.category)}
                    </span>
                  </div>
                </div>

                <div className="h-[2px]" style={{ backgroundColor: style.accent, opacity: 0.4 }} />

                <div className="p-3.5">
                  <h3 className="text-sm font-semibold truncate text-foreground">{tmpl.name}</h3>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tmpl.description}</p>
                  <button
                    onClick={handleUse}
                    className="mt-3 w-full h-8 rounded-lg border border-border text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye size={12} />
                    Ouvrir le template
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {preview && (
          <PreviewModal
            name={preview.name}
            description={preview.description}
            categoryId={preview.categoryId}
            html={preview.html}
            onClose={() => setPreview(null)}
            onUse={preview.onUse}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setCreateOpen(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[420px] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Sparkles size={20} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Nouveau template prédéfini</h3>
              <p className="text-sm text-muted-foreground mb-5">
                {createFromAll
                  ? 'Choisissez une catégorie et donnez un titre. Vous concevrez ensuite l’email.'
                  : `Il sera créé dans « ${categoryLabel(createCategory)} ». Donnez-lui un titre.`}
              </p>

              {createFromAll && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all bg-white"
                  >
                    {REAL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre du template</label>
                <input
                  type="text"
                  autoFocus
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitCreate(); }}
                  placeholder="ex. Offre de bienvenue"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={submitCreate}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={15} />
                  Concevoir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[400px] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Supprimer ce template prédéfini ?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                « {deleteTarget.name} » sera retiré de la galerie prédéfinie. Cette action est irréversible.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
