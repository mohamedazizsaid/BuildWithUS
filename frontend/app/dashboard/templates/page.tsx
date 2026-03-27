'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Mail, FileText, ScrollText, MoreHorizontal, Clock, Copy, Trash2 } from 'lucide-react';
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

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string; bg: string }> = {
  EMAIL: { label: 'Email', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
  FACTURE: { label: 'Facture', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  CONTRAT: { label: 'Contrat', icon: ScrollText, color: 'text-amber-600', bg: 'bg-amber-50' },
  email: { label: 'Email', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
  facture: { label: 'Facture', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  contrat: { label: 'Contrat', icon: ScrollText, color: 'text-amber-600', bg: 'bg-amber-50' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG['EMAIL'];
}

function formatDate(dateStr: string) {
  if (!dateStr || dateStr === '0') return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function TemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templates.list({ page: 1, limit: 50 });
      setTemplateList(data.templates || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id: string, name: string) => {
    try {
      await templates.duplicate(id, `${name} (copy)`);
      toast.success('Template duplicated');
      loadTemplates();
    } catch {
      toast.error('Failed to duplicate');
    }
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await templates.delete(id);
      toast.success('Template deleted');
      loadTemplates();
    } catch {
      toast.error('Failed to delete');
    }
    setMenuOpen(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
          <p className="text-slate-500 text-sm mt-1">
            {templateList.length} template{templateList.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => router.push('/dashboard/templates/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus size={16} />
            New Template
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
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Mail size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium mb-1">No templates yet</p>
          <p className="text-slate-400 text-sm mb-6">Create your first template to get started</p>
          {canEdit && (
            <button
              onClick={() => router.push('/dashboard/templates/new')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800"
            >
              <Plus size={16} />
              Create Template
            </button>
          )}
        </motion.div>
      ) : (
        /* Template Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templateList.map((tmpl, i) => {
            const config = getTypeConfig(tmpl.type);
            const Icon = config.icon;

            return (
              <motion.div
                key={tmpl.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200"
              >
                {/* Card Header — colored strip */}
                <div className={`h-1.5 ${config.bg}`} />

                {/* Card Body */}
                <div className="p-5">
                  {/* Type badge + menu */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      <Icon size={12} />
                      {config.label}
                    </span>

                    {canEdit && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === tmpl.id ? null : tmpl.id);
                          }}
                          className="w-7 h-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-slate-100 transition-all"
                        >
                          <MoreHorizontal size={14} className="text-slate-500" />
                        </button>

                        {menuOpen === tmpl.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-xl border border-slate-200 py-1 w-40">
                              <button
                                onClick={() => handleDuplicate(tmpl.id, tmpl.name)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                <Copy size={12} />
                                Duplicate
                              </button>
                              <button
                                onClick={() => handleDelete(tmpl.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-sm font-semibold text-slate-900 mb-1 truncate">
                    {tmpl.name}
                  </h3>

                  {/* Description */}
                  {tmpl.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                      {tmpl.description}
                    </p>
                  )}

                  {/* Subject (for emails) */}
                  {tmpl.subject && (
                    <p className="text-xs text-slate-400 mb-3 truncate">
                      Subject: {tmpl.subject}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock size={11} />
                      <span className="text-[11px]">{formatDate(tmpl.created_at) || 'Just now'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">v{tmpl.version}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Click outside to close menus */}
      {menuOpen && <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
