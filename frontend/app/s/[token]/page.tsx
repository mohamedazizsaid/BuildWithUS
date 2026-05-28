'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { developers, setEmbedToken, setBuilderReturnUrl } from '@/lib/api';

export default function SessionExchangePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params?.token;
    if (!token) {
      setError('Token de session manquant.');
      return;
    }

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
          // For 'edit' we still need to know the type to pick an editor.
          // /dashboard/templates already has a typed router (handleEdit) but
          // it expects a Template object. Safest: send the user to the list,
          // they click the template; integration callers wanting deep-edit
          // can pass mode=list with a templateId hint later.
          router.replace(`/dashboard/templates?edit=${encodeURIComponent(templateId)}`);
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
  }, [params?.token, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h1 className="text-xl font-semibold mb-2">Session impossible</h1>
          <p className="text-white/60 text-sm mb-6">{error}</p>
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
