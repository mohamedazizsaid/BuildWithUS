'use client';

import { useAuth } from '@/context/auth';
import { FileText, Users, Star, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: 'Templates', value: '0', icon: FileText, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Favourites', value: '0', icon: Star, color: 'bg-amber-50 text-amber-600' },
    { label: 'Team Members', value: '1', icon: Users, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Usage This Month', value: '0', icon: TrendingUp, color: 'bg-rose-50 text-rose-600' },
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
          Welcome back, {user?.first_name}
        </h1>
        <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening with your templates.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Templates */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-white rounded-xl border border-slate-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Templates</h2>
          <button className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            View all
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No templates yet</p>
          <p className="text-slate-400 text-xs mt-1">Create your first template to get started</p>
        </div>
      </motion.div>
    </div>
  );
}
