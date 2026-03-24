'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth';
import {
  LayoutDashboard,
  FileText,
  Star,
  Users,
  UserPlus,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  const mainLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/templates', label: 'Templates', icon: FileText },
    ...(canEdit ? [{ href: '/dashboard/templates/new', label: 'Create Template', icon: Plus }] : []),
    { href: '/dashboard/favourites', label: 'Favourites', icon: Star },
  ];

  const adminLinks = [
    { href: '/dashboard/team', label: 'Team Members', icon: Users },
    { href: '/dashboard/invite', label: 'Invite Member', icon: UserPlus },
  ];

  const bottomLinks = [
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
          ${isActive
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <Icon size={20} className="flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={`h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300
        ${collapsed ? 'w-[72px]' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-slate-200 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">W</span>
        </div>
        {!collapsed && <span className="font-semibold text-slate-900 text-lg">Winaity</span>}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-200 space-y-1">
            {!collapsed && (
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Admin
              </p>
            )}
            {adminLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-200 space-y-1">
        {bottomLinks.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
        <button
          onClick={logout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200 w-full
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-200 w-full
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
