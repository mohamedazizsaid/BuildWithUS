'use client';

import { useAuth } from '@/context/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppSidebar from '@/components/dashboard/Sidebar';
import Navbar from '@/components/dashboard/Navbar';
import { SearchProvider } from '@/context/search';
import { isEmbedMode } from '@/lib/api';

export default function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isEditorPage =
    pathname?.startsWith('/dashboard/templates/editor') ||
    pathname?.startsWith('/dashboard/templates/contract-editor') ||
    pathname?.startsWith('/dashboard/templates/invoice-editor') ||
    pathname?.startsWith('/dashboard/templates/sms-editor') ||
    pathname?.startsWith('/dashboard/templates/rcs-editor') ||
    pathname?.startsWith('/dashboard/templates/generate');

  // Integration sessions (opened by a third-party tool via /s/<token>) are
  // create-only: no sidebar, no navbar — just the type chooser + editor chrome.
  const inIntegration = isEmbedMode();

  useEffect(() => {
    // In embed mode the AuthProvider stubs a user from the M2M token, so
    // `user` is non-null. Skip the redirect either way — extra safety.
    if (!loading && !user && !isEmbedMode()) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Editor page OR integration session: full screen, no sidebar/navbar
  if (isEditorPage || inIntegration) {
    return (
      <div className="h-screen overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <SearchProvider>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <Navbar />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </SearchProvider>
  );
}
