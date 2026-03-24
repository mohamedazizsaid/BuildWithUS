'use client';

import { Search } from 'lucide-react';
import { useAuth } from '@/context/auth';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates, members..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-4 ml-6">
        <div className="px-3 py-1 bg-slate-100 rounded-full">
          <span className="text-xs font-medium text-slate-600">{user?.tenant_name}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
