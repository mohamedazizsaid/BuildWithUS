'use client';

// ─── Embed entry page ──────────────────────────────────────────────────────
// Loaded inside an iframe by a host app ("Tool X"). The host puts the M2M
// JWT in the URL fragment so it never reaches our server logs:
//
//   http://builder.../embed#token=eyJ…&mode=new&templateId=…&returnOrigin=https://toolx
//
// This page:
//   1. Pulls the params out of the fragment.
//   2. Hands the token to the shared API client via setEmbedToken().
//   3. Strips the fragment from the address bar so it stops sitting in
//      window.location.
//   4. postMessages { event: 'ready' } to the host so the host knows the
//      handshake completed.
//   5. Shows a minimal "you're embedded" UI with demo buttons that exercise
//      the Bearer-auth API path and the parent → iframe → parent comms.
//
// What this DOES NOT do yet (Step 3):
//   - mount the real contract editor inside the iframe
//   - hide chrome (sidebar, top nav) on the editor
//   - postMessage on actual save

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { setEmbedToken, setEmbedReturnOrigin, templates } from '@/lib/api';

interface EmbedParams {
  token: string;
  mode: string;
  templateId: string | null;
  returnOrigin: string | null;
}

function parseHash(): EmbedParams | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const p = new URLSearchParams(raw);
  const token = p.get('token');
  if (!token) return null;
  return {
    token,
    mode: p.get('mode') ?? 'new',
    templateId: p.get('templateId'),
    returnOrigin: p.get('returnOrigin'),
  };
}

export default function EmbedPage() {
  const router = useRouter();
  const [params, setParams] = useState<EmbedParams | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateCount, setTemplateCount] = useState<number | null>(null);

  useEffect(() => {
    // The params come from window.location.hash — client-only state invisible
    // during SSR — and this effect must also run real post-mount side effects
    // (token handoff, fragment scrub, postMessage, navigation). So the state
    // sync genuinely belongs here, not in a render-time initializer (which
    // would break hydration). The synchronous setState below is intentional.
    /* eslint-disable react-hooks/set-state-in-effect */
    const p = parseHash();
    if (!p) {
      setError('Aucun token reçu. Cette page doit être chargée depuis Tool X (iframe).');
      return;
    }

    // Step 1: hand token + return-origin to the shared API client.
    setEmbedToken(p.token);
    setEmbedReturnOrigin(p.returnOrigin);
    setParams(p);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Step 2: scrub the fragment from the URL.
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch { /* non-fatal */ }

    // Step 3: tell the host we're ready.
    if (p.returnOrigin && window.parent !== window) {
      try {
        window.parent.postMessage({ event: 'ready' }, p.returnOrigin);
      } catch (err) {
        console.error('postMessage(ready) failed', err);
      }
    }

    // Step 4: route to the actual screen the host requested. We use
    // client-side nav so the in-memory token survives the transition.
    //
    //   mode=new        → blank contract editor (existing flow)
    //   mode=edit&id=X  → contract editor opened to template X
    //   mode=list       → templates list page (sidebar visible, can navigate)
    //   mode=dashboard  → full dashboard home (sidebar + nav, full freedom)
    if (p.mode === 'new') {
      router.replace(`/embed/contract-editor?name=${encodeURIComponent('Nouveau contrat')}`);
    } else if (p.mode === 'edit' && p.templateId) {
      router.replace(`/embed/contract-editor?id=${encodeURIComponent(p.templateId)}`);
    } else if (p.mode === 'list') {
      router.replace('/dashboard/templates');
    } else if (p.mode === 'dashboard') {
      router.replace('/dashboard');
    }
    // Any unknown mode → stay on this stub (useful for debugging the handshake).
  }, [router]);

  const listTemplates = async () => {
    try {
      const res = await templates.list();
      const list = Array.isArray(res?.templates) ? res.templates : [];
      setTemplateCount(list.length);
      toast.success(`${list.length} template(s) listé(s) via Bearer JWT`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l’appel /templates');
    }
  };

  const sendSimulatedSave = () => {
    if (!params?.returnOrigin) {
      toast.error('Aucun returnOrigin — impossible de postMessage');
      return;
    }
    window.parent.postMessage(
      { event: 'saved', templateId: 'demo-12345', name: 'Template démo' },
      params.returnOrigin,
    );
    toast.success('postMessage envoyé au parent');
  };

  const closeEmbed = () => {
    if (params?.returnOrigin) {
      window.parent.postMessage({ event: 'closed' }, params.returnOrigin);
    }
  };

  if (error) {
    return (
      <div style={shellStyle}>
        <div style={cardStyle}>
          <h1 style={h1Style}>Embed — erreur</h1>
          <p style={pStyle}>{error}</p>
        </div>
      </div>
    );
  }

  if (!params) {
    return (
      <div style={shellStyle}>
        <div style={cardStyle}>
          <p style={pStyle}>Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <h1 style={h1Style}>Winaity — mode embed</h1>
            <p style={{ ...pStyle, margin: '4px 0 0' }}>
              Mode : <strong>{params.mode}</strong>
              {params.templateId && <> · template : <code style={codeStyle}>{params.templateId}</code></>}
            </p>
          </div>
          <button onClick={closeEmbed} style={subtleButtonStyle}>Fermer</button>
        </header>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Token reçu (tronqué)</h2>
          <pre style={preStyle}>{params.token.substring(0, 48)}…</pre>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Tester l’authentification Bearer</h2>
          <p style={pStyle}>
            Appelle <code style={codeStyle}>GET /templates</code> avec le JWT en
            header <code style={codeStyle}>Authorization: Bearer …</code> (pas
            de cookie). Si ton tenant a des templates, on les compte.
          </p>
          <button onClick={listTemplates} style={primaryButtonStyle}>
            Lister les templates
          </button>
          {templateCount !== null && (
            <p style={{ ...pStyle, color: '#10b981', marginTop: 10 }}>
              ✓ {templateCount} template(s) renvoyé(s) par la gateway via le JWT.
            </p>
          )}
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>2. Tester postMessage → Tool X</h2>
          <p style={pStyle}>
            Envoie un faux événement <code style={codeStyle}>saved</code> à la
            fenêtre parente. Tu devrais voir l’événement apparaître dans le
            « Flow log » de Tool X et le toast vert.
          </p>
          <button onClick={sendSimulatedSave} style={successButtonStyle}>
            Simuler un save
          </button>
        </section>

        <p style={{ ...pStyle, fontSize: 11, color: '#94a3b8', marginTop: 24 }}>
          Étape 3 (à venir) : remplacer cette page de démonstration par le vrai
          éditeur de contrat, en mode minimal-chrome.
        </p>
      </div>
    </div>
  );
}

// ─── Inline styles (no Tailwind dependency for the embed shell) ────────────
const shellStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  padding: 24,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};
const cardStyle: React.CSSProperties = {
  maxWidth: 720, margin: '0 auto',
  background: 'white', borderRadius: 8, padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};
const h1Style: React.CSSProperties = { margin: 0, fontSize: 20, color: '#0f172a' };
const h2Style: React.CSSProperties = {
  margin: 0, fontSize: 12, color: '#475569',
  textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700,
};
const pStyle: React.CSSProperties = { color: '#475569', fontSize: 13, lineHeight: 1.55, margin: '8px 0' };
const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 16,
};
const codeStyle: React.CSSProperties = {
  background: '#f1f5f9', padding: '1px 6px', borderRadius: 3,
  fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12,
};
const preStyle: React.CSSProperties = {
  background: '#0f172a', color: '#cbd5e1',
  padding: 12, borderRadius: 6,
  overflow: 'auto', fontSize: 11, margin: '8px 0 0',
};
const primaryButtonStyle: React.CSSProperties = {
  background: '#0f172a', color: 'white',
  border: 'none', padding: '9px 18px', borderRadius: 6,
  fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const successButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle, background: '#10b981',
};
const subtleButtonStyle: React.CSSProperties = {
  background: '#e2e8f0', color: '#0f172a',
  border: 'none', padding: '5px 12px', borderRadius: 4,
  fontWeight: 500, fontSize: 12, cursor: 'pointer',
};
