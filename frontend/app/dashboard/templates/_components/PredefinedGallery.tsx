'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, X } from 'lucide-react';
import { PREDEFINED_TEMPLATES, PREDEFINED_CATEGORIES, CATEGORY_STYLES, type PredefinedTemplate } from '@/lib/predefined-templates';
import { renderRowsPreview } from '@/lib/preview-html';

function PredefinedThumbnail({ tmpl }: { tmpl: PredefinedTemplate }) {
  const html = useMemo(() => renderRowsPreview(tmpl.rows()), [tmpl.id]);
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

function PredefinedPreviewModal({
  tmpl,
  onClose,
  onUse,
}: {
  tmpl: PredefinedTemplate;
  onClose: () => void;
  onUse: () => void;
}) {
  const html = useMemo(() => renderRowsPreview(tmpl.rows()), [tmpl.id]);
  const style = CATEGORY_STYLES[tmpl.category] || CATEGORY_STYLES.b2b;
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
              {PREDEFINED_CATEGORIES.find(c => c.id === tmpl.category)?.label}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{tmpl.name}</h3>
              <p className="text-[11px] text-muted-foreground truncate">{tmpl.description}</p>
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewTarget, setPreviewTarget] = useState<PredefinedTemplate | null>(null);

  const filtered = selectedCategory === 'all'
    ? PREDEFINED_TEMPLATES
    : PREDEFINED_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-6">
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
                {PREDEFINED_TEMPLATES.filter(t => t.category === cat.id).length}
              </span>
            )}
          </button>
        ))}
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
          {filtered.map((tmpl, i) => {
            const style = CATEGORY_STYLES[tmpl.category] || CATEGORY_STYLES.b2b;
            const handleUse = () => onUse(tmpl.id, tmpl.name);

            return (
              <motion.div
                key={tmpl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="relative">
                  <PredefinedThumbnail tmpl={tmpl} />

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-200 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPreviewTarget(tmpl)}
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
                      {PREDEFINED_CATEGORIES.find(c => c.id === tmpl.category)?.label}
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
        {previewTarget && (
          <PredefinedPreviewModal
            tmpl={previewTarget}
            onClose={() => setPreviewTarget(null)}
            onUse={() => {
              const t = previewTarget;
              setPreviewTarget(null);
              if (t) onUse(t.id, t.name);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
