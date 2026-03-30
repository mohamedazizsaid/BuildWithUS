'use client';

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
  Plus,
  ChevronsUpDown,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  const mainLinks = [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/dashboard/templates', label: 'Modèles', icon: FileText },
    ...(canEdit ? [{ href: '/dashboard/templates/new', label: 'Créer un modèle', icon: Plus }] : []),
    { href: '/dashboard/favourites', label: 'Favoris', icon: Star },
  ];

  const adminLinks = [
    { href: '/dashboard/team', label: 'Membres de l\'équipe', icon: Users },
    { href: '/dashboard/invite', label: 'Inviter un membre', icon: UserPlus },
  ];

  return (
    <Sidebar collapsible="icon">
      {/* Header — Logo + Tenant */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <span className="font-bold text-sm">WTB</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">WinTB</span>
                  <span className="truncate text-xs text-muted-foreground">{user?.tenant_name}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Plateforme</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainLinks.map((link) => (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton asChild isActive={pathname === link.href} tooltip={link.label}>
                    <Link href={link.href}>
                      <link.icon />
                      <span>{link.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminLinks.map((link) => (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton asChild isActive={pathname === link.href} tooltip={link.label}>
                        <Link href={link.href}>
                          <link.icon />
                          <span>{link.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer — User Menu */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-slate-900 text-white text-xs">
                      {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.first_name} {user?.last_name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-slate-900 text-white text-xs">
                      {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.first_name} {user?.last_name}</span>
                    <span className="truncate text-xs text-muted-foreground capitalize">{user?.role}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-500 focus:text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
