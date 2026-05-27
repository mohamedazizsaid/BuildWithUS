'use client';

// ─── Embedded contract editor ──────────────────────────────────────────────
// The /embed page sets the M2M token + return-origin in the API client, then
// client-routes here. We render the exact same ContractEditorContent the
// dashboard uses — the editor itself checks `usePathname().startsWith('/embed')`
// to decide whether to:
//   - rename "Retour" → "Fermer" and postMessage({ event: 'closed' })
//   - postMessage({ event: 'saved', templateId, name }) on save instead of
//     redirecting to /dashboard/templates
//
// No layout file is needed: this route lives outside /dashboard, so it
// bypasses the auth-gated dashboard layout. The root <AuthProvider> is fine
// with an unauthenticated user — `user` stays null, which the editor handles.

import { Suspense } from 'react';
import { ContractEditorContent } from '@/app/dashboard/templates/contract-editor/page';

export default function EmbeddedContractEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ContractEditorContent />
    </Suspense>
  );
}
