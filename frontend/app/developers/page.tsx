'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Copy, Eye, EyeOff, Key, Shield, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { developers } from '@/lib/api';

const EASE = [0.25, 0.1, 0.25, 1] as const;

interface Credentials {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  scopes: string;
}

export default function DevelopersPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Nom et e-mail sont requis');
      return;
    }
    setSubmitting(true);
    try {
      const data = await developers.register({ name: name.trim(), email: email.trim() });
      setCreds(data);
      setName('');
      setEmail('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la création');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-black text-sm">W</span>
            </div>
            <span className="text-white font-semibold text-sm">WinTemplate Developers</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/70 text-sm hover:text-white transition-colors">
              Accueil
            </Link>
            <Link
              href="/login"
              className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-white/90 transition-all"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-gradient-radial from-indigo-600/20 to-transparent blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white/70 mb-6">
              <Zap className="w-3 h-3" /> API & intégrations
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
              Intègre WinTemplate dans ton produit
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Permets à tes utilisateurs de créer des templates depuis ton app —
              sans gérer de mots de passe, sans deuxième compte. Un client_id, un
              client_secret, et un redirect.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold mb-8 text-center">Comment ça marche</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: '1', t: 'Crée tes clés', d: 'Remplis le formulaire ci-dessous. Tu reçois un client_id + client_secret en une seule fois — copie-les dans ton .env.' },
            { n: '2', t: 'Déclare tes URLs de retour', d: 'Liste les URLs où WinTemplate peut renvoyer tes utilisateurs après un save. Anti-redirection ouverte.' },
            { n: '3', t: 'Redirige tes users', d: 'Depuis ton backend, demande une session à WinTemplate, puis envoie ton user vers l\'URL renvoyée. Au save, il revient chez toi.' },
          ].map((step) => (
            <div key={step.n} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm mb-3">{step.n}</div>
              <h3 className="font-semibold mb-2">{step.t}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6" />
            <h2 className="text-2xl font-semibold">Récupère tes clés</h2>
          </div>
          <p className="text-white/60 text-sm mb-6">
            Pas de mot de passe à gérer. Juste un nom et une adresse e-mail de contact.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="dev-name" className="block text-sm text-white/70 mb-2">
                Nom de l&apos;application
              </label>
              <input
                id="dev-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Acme CRM"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                required
              />
            </div>
            <div>
              <label htmlFor="dev-email" className="block text-sm text-white/70 mb-2">
                E-mail de contact
              </label>
              <input
                id="dev-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@acme.com"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? 'Création...' : (<>Générer mes clés <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold mb-2 text-center">Exemple — backend Node.js</h2>
        <p className="text-white/60 text-sm mb-8 text-center">
          Côté serveur uniquement. Ne mets jamais ton <code className="bg-white/10 px-1.5 py-0.5 rounded">client_secret</code> dans le navigateur.
        </p>
        <pre className="bg-zinc-950 border border-white/10 rounded-xl p-6 text-xs overflow-x-auto text-white/80 leading-relaxed">
{`// 1. L'utilisateur clique "Créer un template" dans ton app
app.get('/create-template', async (req, res) => {
  const r = await fetch('http://localhost:3000/api/builder-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.BUILDER_CLIENT_ID,
      client_secret: process.env.BUILDER_CLIENT_SECRET,
      mode:          'new',                                   // 'new' | 'edit' | 'list'
      return_url:    'https://example.com/builder/callback',  // doit être dans ton allowlist
      user_ref:      req.user.id,                             // audit only, optionnel
    }),
  });
  const { url } = await r.json();
  res.redirect(url); // → l'utilisateur va vers builder.com/s/<token>
});

// 2. Au save, WinTemplate renvoie l'utilisateur ici avec ?template_id=...
app.get('/builder/callback', (req, res) => {
  const templateId = req.query.template_id;
  // stocke templateId, redirige où tu veux
  res.redirect('/dashboard?created=' + templateId);
});`}
        </pre>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <Shield className="w-5 h-5 mb-3 text-emerald-400" />
            <h3 className="font-semibold mb-2 text-sm">Allowlist obligatoire</h3>
            <p className="text-white/60 text-xs leading-relaxed">
              Chaque tenant doit déclarer ses <code className="bg-white/10 px-1 rounded">return_url</code> autorisés
              avant de pouvoir minter une session. Empêche un secret volé de rediriger vers du phishing.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <Check className="w-5 h-5 mb-3 text-emerald-400" />
            <h3 className="font-semibold mb-2 text-sm">Token one-shot, 24h</h3>
            <p className="text-white/60 text-xs leading-relaxed">
              Le token d&apos;URL est burned au premier exchange. La session JWT qui en sort dure 24h max.
            </p>
          </div>
        </div>
      </section>

      {creds && <CredentialsModal creds={creds} onClose={() => setCreds(null)} />}
    </div>
  );
}

function CredentialsModal({ creds, onClose }: { readonly creds: Credentials; readonly onClose: () => void }) {
  const [showSecret, setShowSecret] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${label} copié`),
      () => toast.error('Échec de la copie'),
    );
  };

  const masked = '•'.repeat(Math.min(32, creds.client_secret.length));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="bg-zinc-950 border border-white/10 rounded-2xl max-w-2xl w-full p-8 shadow-2xl"
      >
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Key className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-1">Tes clés API</h2>
            <p className="text-white/60 text-sm">
              Sauvegarde-les dans ton <code className="bg-white/10 px-1 rounded">.env</code> maintenant.
              Le <strong>client_secret</strong> ne sera plus jamais affiché.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <CredentialField label="TENANT_ID" value={creds.tenant_id} onCopy={() => copy('tenant_id', creds.tenant_id)} />
          <CredentialField label="BUILDER_CLIENT_ID" value={creds.client_id} onCopy={() => copy('client_id', creds.client_id)} />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono text-white/50">BUILDER_CLIENT_SECRET</span>
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="text-xs text-white/60 hover:text-white flex items-center gap-1"
              >
                {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showSecret ? 'Cacher' : 'Afficher'}
              </button>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5">
              <code className="text-amber-100 text-xs font-mono flex-1 break-all">
                {showSecret ? creds.client_secret : masked}
              </code>
              <button
                type="button"
                onClick={() => copy('client_secret', creds.client_secret)}
                className="text-white/60 hover:text-white shrink-0"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm text-white/80">
              J&apos;ai sauvegardé mon <strong>client_secret</strong>. Je comprends qu&apos;il ne sera plus
              affiché et que je devrai recréer une intégration si je le perds.
            </span>
          </label>
        </div>

        <p className="text-xs text-white/40 mt-6">
          Prochaine étape : déclare tes <code className="bg-white/10 px-1 rounded">return_url</code> autorisés
          via <code className="bg-white/10 px-1 rounded">POST /developers/return-urls</code> avant de minter ta première session.
        </p>

        <button
          type="button"
          onClick={onClose}
          disabled={!confirmed}
          className="w-full mt-6 bg-white text-black font-medium py-3 rounded-lg hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          C&apos;est sauvegardé, fermer
        </button>
      </motion.div>
    </div>
  );
}

function CredentialField({ label, value, onCopy }: { readonly label: string; readonly value: string; readonly onCopy: () => void }) {
  return (
    <div>
      <div className="text-xs font-mono text-white/50 mb-1.5">{label}</div>
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
        <code className="text-white/80 text-xs font-mono flex-1 break-all">{value}</code>
        <button type="button" onClick={onCopy} className="text-white/60 hover:text-white shrink-0">
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
