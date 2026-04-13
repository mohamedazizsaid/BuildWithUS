'use client';

import { useAuth } from '@/context/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FileText, Users, Star, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { templates, auth } from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  const [counts, setCounts] = useState({ templates: 0, favourites: 0, members: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const calls: Promise<any>[] = [
          templates.list({ page: 1, limit: 1 }),
          templates.list({ page: 1, limit: 1, favoritesOnly: true }),
        ];
        if (isAdmin) calls.push(auth.listMembers());

        const results = await Promise.allSettled(calls);

        const totalTemplates =
          results[0].status === 'fulfilled' ? results[0].value?.pagination?.total ?? 0 : 0;
        const totalFavourites =
          results[1].status === 'fulfilled' ? results[1].value?.pagination?.total ?? 0 : 0;
        const totalMembers =
          isAdmin && results[2]?.status === 'fulfilled'
            ? (results[2].value?.members?.length ?? 1)
            : 1;

        setCounts({ templates: totalTemplates, favourites: totalFavourites, members: totalMembers });
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
        {stats.map((stat, i) => {
          const card = (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className={`bg-white rounded-xl border border-slate-200 p-5 transition-all duration-200 ${
                stat.href
                  ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                  : ''
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
          );

          return card;
        })}
      </div>

      {/* Modèles récents */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-white rounded-xl border border-slate-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Modèles récents</h2>
          <button
            onClick={() => router.push('/dashboard/templates')}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Voir tout
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">Aucun modèle récent</p>
          <p className="text-slate-400 text-xs mt-1">Créez votre premier modèle pour commencer</p>
        </div>
      </motion.div>
    </div>
  );
}
