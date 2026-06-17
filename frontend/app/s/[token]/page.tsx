'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { developers, templates, setEmbedToken, setBuilderReturnUrl } from '@/lib/api';

// Resolve the editor path + query for an "edit" session, matching the editor
// to the template type like the "new" flow does (2 = facture, 3 = contrat,
// 4 = sms, else email). Falls back to the email editor if the read fails.
async function resolveEditDestination(templateId: string): Promise<string> {
  let route = 'editor';
  const params = new URLSearchParams({ id: templateId });
  try {
    const res = await templates.get(templateId);
    const template = res?.template ?? res;
    const t = Number(template?.type);
    if (t === 4) route = 'sms-editor';
    else if (t === 2) route = 'invoice-editor';
    else if (t === 3) route = 'contract-editor';
    params.set('name', template?.name ?? '');
    params.set('description', template?.description ?? '');
    params.set('type', String(template?.type ?? ''));
  } catch {
    // Read failed → fall back to the email editor (previous behaviour).
  }
  return `/dashboard/templates/${route}?${params.toString()}`;
}

export default function SessionExchangePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await developers.exchangeSession(token);
        if (cancelled) return;

        setEmbedToken(res.access_token);
        setBuilderReturnUrl(res.return_url || null);

        const mode = res.mode || 'new';
        const templateId = res.template_id || '';

        if (mode === 'new') {
          // Land on the type chooser — user picks email/facture/contract,
          // which then routes to the right editor. The return_url is already
          // in sessionStorage so save-and-return works from any editor.
          router.replace('/dashboard/templates/new');
        } else if (mode === 'edit' && templateId) {
          // The embed token is set above, so this read is authenticated.
          const dest = await resolveEditDestination(templateId);
          if (cancelled) return;
          router.replace(dest);
        } else if (mode === 'list') {
          router.replace('/dashboard/templates');
        } else {
          router.replace('/dashboard');
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Session invalide ou expirée.';
        setError(msg);
      }
    })();

    return () => { cancelled = true; };
  }, [token, router]);

  // Missing token is derivable at render time — no effect/setState needed.
  const displayError = error ?? (!token ? 'Token de session manquant.' : null);

  if (displayError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h1 className="text-xl font-semibold mb-2">Session impossible</h1>
          <p className="text-white/60 text-sm mb-6">{displayError}</p>
          <p className="text-white/40 text-xs">
            Demande à l&apos;application qui t&apos;a redirigé de réessayer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white/60 text-sm">Ouverture de ta session...</p>
      </div>
    </div>
  );
}
