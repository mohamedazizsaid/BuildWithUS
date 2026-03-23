'use client';

import { useAuth } from '@/context/auth';

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Welcome back, {user?.first_name} {user?.last_name}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">Role</p>
            <p className="text-xl font-semibold text-slate-900 capitalize">{user?.role}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">Email</p>
            <p className="text-xl font-semibold text-slate-900">{user?.email}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">Tenant ID</p>
            <p className="text-sm font-mono text-slate-700 truncate">{user?.tenant_id}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Templates</h2>
          <p className="text-slate-500 text-sm">Coming soon — your templates will appear here.</p>
        </div>
      </div>
    </div>
  );
}
