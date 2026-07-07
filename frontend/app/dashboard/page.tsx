'use client';

import { useAuth } from '@/context/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FileText, Users, Star, TrendingUp, Mail, ScrollText, Pencil, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { templates, auth } from '@/lib/api';

interface RecentTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  updated_at: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string; bg: string }> = {
  EMAIL:   { label: 'Email',   icon: Mail,       color: 'text-blue-600',    bg: 'bg-blue-50' },
  FACTURE: { label: 'Facture', icon: FileText,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  CONTRAT: { label: 'Contrat', icon: ScrollText, color: 'text-amber-600',   bg: 'bg-amber-50' },
  email:   { label: 'Email',   icon: Mail,       color: 'text-blue-600',    bg: 'bg-blue-50' },
  facture: { label: 'Facture', icon: FileText,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  contrat: { label: 'Contrat', icon: ScrollText, color: 'text-amber-600',   bg: 'bg-amber-50' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG['EMAIL'];
}

function relativeTime(dateStr: string): string {
  if (!dateStr || dateStr === '0') return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
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

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  const [counts, setCounts] = useState({ templates: 0, favourites: 0, members: 1 });
  const [recentTemplates, setRecentTemplates] = useState<RecentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Returning from Stripe Checkout (success_url = /dashboard?upgraded=1).
  // Read from window (client-only) to avoid needing a Suspense/useSearchParams.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === '1') {
      toast.success('Paiement réussi — votre abonnement est actif 🎉');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const calls: Promise<unknown>[] = [
          templates.list({ page: 1, limit: 1 }),
          templates.list({ page: 1, limit: 1, favoritesOnly: true }),
          templates.list({ page: 1, limit: 5, sortBy: 'updatedAt', ascending: false }),
        ];
        if (isAdmin) calls.push(auth.listMembers());

        const results = await Promise.allSettled(calls);

        // The calls array is typed as unknown[] (heterogeneous), so narrow the
        // settled values to the shapes we actually read here.
        type ListResp = { pagination?: { total?: number }; templates?: RecentTemplate[] };
        type MembersResp = { members?: unknown[] };

        const totalTemplates =
          results[0].status === 'fulfilled' ? (results[0].value as ListResp).pagination?.total ?? 0 : 0;
        const totalFavourites =
          results[1].status === 'fulfilled' ? (results[1].value as ListResp).pagination?.total ?? 0 : 0;
        const recent =
          results[2].status === 'fulfilled' ? (results[2].value as ListResp).templates ?? [] : [];
        const totalMembers =
          isAdmin && results[3]?.status === 'fulfilled'
            ? ((results[3].value as MembersResp).members?.length ?? 1)
            : 1;

        setCounts({ templates: totalTemplates, favourites: totalFavourites, members: totalMembers });
        setRecentTemplates(recent);
      } catch {
        // silently fail — stats are non-critical
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  const stats = [
    {
      label: 'Modèles',
      value: counts.templates,
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-600',
      href: '/dashboard/templates',
    },
    {
      label: 'Favoris',
      value: counts.favourites,
      icon: Star,
      color: 'bg-amber-50 text-amber-600',
      href: '/dashboard/favourites',
    },
    ...(isAdmin
      ? [{
          label: "Membres de l'équipe",
          value: counts.members,
          icon: Users,
          color: 'bg-emerald-50 text-emerald-600',
          href: '/dashboard/team',
        }]
      : []),
    {
      label: 'Utilisation ce mois',
      value: 0,
      icon: TrendingUp,
      color: 'bg-rose-50 text-rose-600',
      href: null,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-slate-900">
          Bon retour, {user?.first_name}
        </h1>
        <p className="text-slate-500 mt-1">Voici ce qui se passe avec vos modèles.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            className={`bg-white rounded-xl border border-slate-200 p-5 transition-all duration-200 ${
              stat.href ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''
            }`}
            onClick={() => stat.href && router.push(stat.href)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? (
                <span className="inline-block w-8 h-6 bg-slate-100 rounded animate-pulse" />
              ) : (
                stat.value
              )}
            </p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Modèles récents */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-white rounded-xl border border-slate-200 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Modèles récents</h2>
          <button
            onClick={() => router.push('/dashboard/templates')}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Voir tout
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-2.5 bg-slate-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : recentTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileText size={36} className="text-slate-200 mb-3" />
            <p className="text-slate-500 text-sm">Aucun modèle récent</p>
            <p className="text-slate-400 text-xs mt-1">Créez votre premier modèle pour commencer</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 -mx-6 px-6">
            {recentTemplates.map((tmpl, i) => {
              const config = getTypeConfig(tmpl.type);
              const TypeIcon = config.icon;
              const date = tmpl.updated_at || tmpl.created_at;

              return (
                <motion.li
                  key={tmpl.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.06 }}
                  className="group flex items-center gap-3 py-3 hover:bg-slate-50 -mx-6 px-6 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/templates/editor?id=${tmpl.id}`)}
                >
                  {/* Type icon */}
                  <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon size={16} className={config.color} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{tmpl.name}</p>
                    {tmpl.description && (
                      <p className="text-xs text-slate-400 truncate">{tmpl.description}</p>
                    )}
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1 text-slate-400 flex-shrink-0">
                    <Clock size={11} />
                    <span className="text-xs">{relativeTime(date)}</span>
                  </div>

                  {/* Edit on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/templates/editor?id=${tmpl.id}`); }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-all flex-shrink-0"
                    title="Modifier"
                  >
                    <Pencil size={13} className="text-slate-500" />
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
