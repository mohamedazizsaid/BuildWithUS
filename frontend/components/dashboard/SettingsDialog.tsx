'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Plug,
  X,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '@/context/auth';
import { auth, integrations, type IntegrationKey } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Section = 'account' | 'integrations';

export default function SettingsDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [section, setSection] = useState<Section>('account');

  // Non-admins never see the Integrations tab — keep them on Account.
  useEffect(() => {
    if (!isAdmin && section === 'integrations') setSection('account');
  }, [isAdmin, section]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const navItems: { id: Section; label: string; icon: typeof UserIcon }[] = [
    { id: 'account', label: 'Compte', icon: UserIcon },
    ...(isAdmin ? [{ id: 'integrations' as const, label: 'Intégrations', icon: Plug }] : []),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex h-[580px] max-h-[88vh] w-[800px] max-w-[94vw] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="text-sm font-semibold">Paramètres</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body: left nav + content */}
            <div className="flex min-h-0 flex-1">
              <nav className="w-52 shrink-0 border-r bg-muted/30 p-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      section === item.id
                        ? 'bg-background font-medium text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {section === 'account' && <AccountSection />}
                {section === 'integrations' && isAdmin && <IntegrationsSection />}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Account section ─────────────────────────────────────────────────────── */

function AccountSection() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [saving, setSaving] = useState(false);

  const dirty = firstName !== (user?.first_name ?? '') || lastName !== (user?.last_name ?? '');

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Le prénom et le nom sont requis');
      return;
    }
    setSaving(true);
    try {
      await auth.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
      toast.success('Profil mis à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Compte</h3>
        <p className="text-sm text-muted-foreground">Gérez vos informations personnelles.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="first-name">Prénom</Label>
          <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last-name">Nom</Label>
          <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
        <Row label="E-mail" value={user?.email ?? '—'} />
        <Row label="Organisation" value={user?.tenant_name ?? '—'} />
        <Row label="Rôle" value={user?.role ?? '—'} capitalize />
      </div>

      <Button onClick={save} disabled={!dirty || saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enregistrer
      </Button>
    </div>
  );
}

function Row({ label, value, capitalize }: { readonly label: string; readonly value: string; readonly capitalize?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</span>
    </div>
  );
}

/* ── Integrations section ────────────────────────────────────────────────── */

function IntegrationsSection() {
  const [keys, setKeys] = useState<IntegrationKey[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [secret, setSecret] = useState<{ client_id: string; client_secret: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await integrations.listKeys();
      setKeys(data.clients ?? []);
    } catch {
      toast.error('Erreur de chargement des clés');
      setKeys([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const result = await integrations.createKey(newLabel);
      setSecret(result);
      setNewLabel('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la génération');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Révoquer cette clé ? Toute intégration qui l\'utilise cessera de fonctionner.')) return;
    try {
      await integrations.revokeKey(id);
      toast.success('Clé révoquée');
      await load();
    } catch {
      toast.error('Erreur lors de la révocation');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Intégrations</h3>
          <p className="text-sm text-muted-foreground">
            Générez des clés API pour connecter votre outil au builder.
          </p>
        </div>
        <Link
          href="/developers"
          target="_blank"
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Documentation <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Create */}
      <div className="flex items-end gap-2 rounded-lg border bg-muted/30 p-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="key-label" className="text-xs">Nom de la clé (optionnel)</Label>
          <Input
            id="key-label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ex : CRM Production"
            maxLength={120}
          />
        </div>
        <Button onClick={create} disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Générer
        </Button>
      </div>

      {/* List */}
      {keys === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          Aucune clé API pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <KeyCard key={k.id} apiKey={k} onRevoke={() => revoke(k.id)} onReturnUrlsSaved={load} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {secret && <NewKeyModal result={secret} onClose={() => setSecret(null)} />}
      </AnimatePresence>
    </div>
  );
}

function KeyCard({
  apiKey,
  onRevoke,
  onReturnUrlsSaved,
}: {
  readonly apiKey: IntegrationKey;
  readonly onRevoke: () => void;
  readonly onReturnUrlsSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [urlsText, setUrlsText] = useState((apiKey.allowed_return_urls ?? []).join('\n'));
  const [saving, setSaving] = useState(false);

  const saveUrls = async () => {
    const urls = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      await integrations.setReturnUrls(apiKey.client_id, urls);
      toast.success('URLs de retour mises à jour');
      setEditing(false);
      onReturnUrlsSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Key className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{apiKey.label || 'Clé API'}</div>
            <div className="flex items-center gap-1.5">
              <code className="truncate font-mono text-xs text-muted-foreground">{apiKey.client_id}</code>
              <CopyBtn text={apiKey.client_id} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {new Date(apiKey.created_at).toLocaleDateString('fr-FR')}
          </span>
          <button onClick={onRevoke} className="text-muted-foreground transition-colors hover:text-destructive" aria-label="Révoquer">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 border-t pt-3">
        {!editing ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">URLs de retour : </span>
              {apiKey.allowed_return_urls?.length ? (
                <span className="break-all">{apiKey.allowed_return_urls.join(', ')}</span>
              ) : (
                <span className="text-amber-600">aucune (requis avant d&apos;ouvrir une session)</span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="shrink-0">
              Modifier
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs">URLs de retour autorisées (une par ligne)</Label>
            <textarea
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              rows={3}
              placeholder={'https://acme.com/builder/callback'}
              className="w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setUrlsText((apiKey.allowed_return_urls ?? []).join('\n')); }}>
                Annuler
              </Button>
              <Button size="sm" onClick={saveUrls} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyBtn({ text }: { readonly text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => toast.error('Échec de la copie'),
    );
  };
  return (
    <button onClick={copy} className="shrink-0 text-muted-foreground transition-colors hover:text-foreground" aria-label="Copier">
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function NewKeyModal({
  result,
  onClose,
}: {
  readonly result: { client_id: string; client_secret: string };
  readonly onClose: () => void;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const masked = '•'.repeat(32);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15">
            <Key className="h-4 w-4 text-green-600" />
          </div>
          <h3 className="font-semibold">Clé API générée</h3>
        </div>

        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs font-medium text-amber-700">
            ⚠️ Le client_secret n&apos;est affiché qu&apos;une seule fois. Copiez-le maintenant et conservez-le en lieu sûr.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 text-xs">Client ID</Label>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <code className="flex-1 truncate font-mono text-xs">{result.client_id}</code>
              <CopyBtn text={result.client_id} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 text-xs">Client Secret</Label>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <code className="flex-1 break-all font-mono text-xs">
                {showSecret ? result.client_secret : masked}
              </code>
              <button onClick={() => setShowSecret((v) => !v)} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Afficher/cacher">
                {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <CopyBtn text={result.client_secret} />
            </div>
          </div>
        </div>

        <Button onClick={onClose} className="mt-5 w-full">
          J&apos;ai copié mes clés
        </Button>
      </motion.div>
    </motion.div>
  );
}
