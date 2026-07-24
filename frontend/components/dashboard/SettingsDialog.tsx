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
  CreditCard,
} from 'lucide-react';
import toast from '@/lib/toast';
import Link from 'next/link';
import { useAuth } from '@/context/auth';
import { auth, integrations, billing, type IntegrationKey, type BillingInfo } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPlan, planPrice, PLAN_LABELS, type PlanId } from '@/lib/plans';

type Section = 'account' | 'billing' | 'integrations';

export default function SettingsDialog({
  open,
  onOpenChange,
  initialSection,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Section to focus when the dialog opens (e.g. deep-linked from /pricing). */
  readonly initialSection?: Section;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [section, setSection] = useState<Section>(initialSection ?? 'account');

  // When (re)opened via a deep link, jump to the requested section.
  useEffect(() => {
    if (open && initialSection) setSection(initialSection);
  }, [open, initialSection]);

  // Billing + Integrations are org-level and admin-only — keep non-admins on Account.
  useEffect(() => {
    if (!isAdmin && (section === 'integrations' || section === 'billing')) setSection('account');
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
    ...(isAdmin ? [{ id: 'billing' as const, label: 'Facturation', icon: CreditCard }] : []),
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
                {section === 'billing' && isAdmin && <BillingSection onClose={() => onOpenChange(false)} />}
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

/* ── Billing section ─────────────────────────────────────────────────────── */

function fmtDate(unixSeconds: number | null): string {
  if (!unixSeconds) return '—';
  return new Date(unixSeconds * 1000).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function BillingSection({ onClose }: { readonly onClose: () => void }) {
  const { user } = useAuth();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setInfo(await billing.get());
    } catch {
      toast.error('Erreur de chargement de la facturation');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const planId = info?.plan ?? 'free';
  const plan = getPlan(planId);
  const planName = plan?.name ?? PLAN_LABELS[planId as PlanId] ?? planId;
  // 'internal' = our own company's unlimited plan: no billing, nothing to cancel.
  const isInternal = planId === 'internal';
  const isPaid = planId !== 'free' && !isInternal;
  const cycleLabel =
    info?.billing_cycle === 'annual'
      ? 'Annuel · engagement 12 mois'
      : info?.billing_cycle === 'monthly'
        ? 'Mensuel · sans engagement'
        : null;
  const scheduledCancel = !!info?.cancel_at;
  // Only the annual commitment ("avec engagement") renews on a set date, so it
  // shows "Prochain renouvellement". A flexible monthly plan is paid one month
  // at a time with no commitment, and a scheduled cancellation both end access —
  // so both are framed as "Fin de l'accès". The date shown is cancel_at when a
  // cancellation is scheduled, otherwise the current period end.
  const showRenewal = info?.billing_cycle === 'annual' && !scheduledCancel;
  const dateLabel = showRenewal ? 'Prochain renouvellement' : "Fin de l'accès";
  const dateValue = scheduledCancel ? info?.cancel_at ?? null : info?.current_period_end ?? null;

  const cancel = async () => {
    if (!confirm("Résilier votre abonnement ? Vous conserverez l'accès jusqu'à la fin de la période déjà payée.")) return;
    setCancelling(true);
    try {
      await billing.cancel();
      toast.success('Résiliation programmée.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la résiliation');
    } finally {
      setCancelling(false);
    }
  };

  const reactivate = async () => {
    setCancelling(true);
    try {
      await billing.reactivate();
      toast.success('Abonnement réactivé.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la réactivation');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Facturation</h3>
        <p className="text-sm text-muted-foreground">Gérez votre plan et vos informations de paiement.</p>
      </div>

      {/* Current plan */}
      <div className="rounded-lg border p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{planName}</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">
                Plan actuel
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isInternal ? 'Compte interne de notre organisation.' : (plan?.tagline ?? cycleLabel)}
            </p>
            <p className="mt-2 text-sm">
              {isInternal ? (
                <span className="text-muted-foreground">Accès illimité — aucune facturation.</span>
              ) : isPaid && plan && info?.billing_cycle ? (
                <>
                  <span className="font-semibold">{planPrice(plan, info.billing_cycle as 'monthly' | 'annual')}€</span>
                  <span className="text-muted-foreground">
                    {info.billing_cycle === 'annual' ? ' / an' : ' / mois'}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Aucun paiement requis.</span>
              )}
            </p>
          </div>
          {!isInternal && (
            <Button asChild variant={isPaid ? 'outline' : 'default'} size="sm" className="shrink-0">
              <Link href="/pricing" onClick={onClose}>
                {isPaid ? 'Changer de plan' : 'Voir les plans'}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Billing information */}
      {isPaid ? (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Moyen de paiement</span>
            <span className="font-medium capitalize">
              {info?.card ? `${info.card.brand} •••• ${info.card.last4}` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{dateLabel}</span>
            <span className="font-medium">{fmtDate(dateValue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">E-mail de facturation</span>
            <span className="font-medium">{user?.email || '—'}</span>
          </div>
          {scheduledCancel && (
            <div className="space-y-2 rounded-md bg-amber-500/10 px-2.5 py-2 text-xs text-amber-700">
              <p>Résiliation programmée — l&apos;abonnement prendra fin à la date ci-dessus.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={reactivate}
                disabled={cancelling}
                className="h-7 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800"
              >
                {cancelling && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Réactiver l&apos;abonnement
              </Button>
            </div>
          )}
        </div>
      ) : isInternal ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Plan interne — aucune information de facturation. Votre organisation dispose d&apos;un accès illimité.
        </div>
      ) : (
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">Débloquez un usage illimité</div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Passez à un plan payant pour lever les limites du plan gratuit.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/checkout?plan=pro&billing=monthly" onClick={onClose}>Passer à Pro</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/checkout?plan=pro_org&billing=monthly" onClick={onClose}>Passer à Pro Org</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Cancel */}
      {isPaid && !scheduledCancel && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="text-sm">
            <div className="font-medium">Résilier l&apos;abonnement</div>
            <div className="text-muted-foreground">
              L&apos;accès reste actif jusqu&apos;à la fin de la période payée.
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={cancel} disabled={cancelling} className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
            {cancelling && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Résilier
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Integrations section ────────────────────────────────────────────────── */

function IntegrationsSection() {
  const [keys, setKeys] = useState<IntegrationKey[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [secret, setSecret] = useState<{ client_id: string; client_secret: string } | null>(null);
  // API keys are a Pro Organisation (or internal) capability. Default true to
  // avoid a flash; corrected once usage loads.
  const [canCreate, setCanCreate] = useState(true);

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
    billing
      .usage()
      .then((u) => setCanCreate(u.can_create_api_keys))
      .catch(() => setCanCreate(true));
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

      {/* Create — gated to Pro Organisation / internal plans */}
      {canCreate ? (
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
      ) : (
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">Réservé au plan Pro Organisation</div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Les clés d&apos;intégration API sont disponibles avec le plan Pro Organisation.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/pricing">Voir les plans</Link>
          </Button>
        </div>
      )}

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
