'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Building2, Key, Trash2, Plus, Copy, Check,
  LogOut, RefreshCw, X, Eye, EyeOff, Users, FileText,
  Search, KeyRound, ChevronDown, CreditCard,
} from 'lucide-react';
import { auth } from '@/lib/api';
import toast from '@/lib/toast';
import { PreviewModal } from '@/app/dashboard/templates/_components/PreviewModal';
import type { Template } from '@/app/dashboard/templates/_lib/types';
import { SubscriptionsTab } from './SubscriptionsTab';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Tenant {
  id: string;
  name: string;
  plan: string;
  created_at: string;
}

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface TemplateRow {
  id: string;
  tenant_id: string;
  tenant_name: string;
  name: string;
  type: string;
  subject?: string;
  content?: string;
  updated_at?: string | number;
}

interface ApiClient {
  id: string;
  client_id: string;
  scopes: string;
  created_at: string;
}

interface NewKeyResult {
  client_id: string;
  client_secret: string;
}

const ROLES = ['admin', 'editor', 'viewer', 'marketing'];
// Assignable plans (must match the gateway's ASSIGNABLE_PLANS whitelist).
const PLANS = ['free', 'pro', 'pro_org', 'internal'];
const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuit',
  pro: 'Pro',
  pro_org: 'Pro Organisation',
  internal: 'Interne (illimité)',
};
const PLAN_STYLES: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600',
  pro: 'bg-indigo-100 text-indigo-700',
  pro_org: 'bg-violet-100 text-violet-700',
  internal: 'bg-amber-100 text-amber-700',
};
const ALL_ROLE_FILTERS = ['admin', 'editor', 'viewer', 'marketing', 'super_admin'];
const TEMPLATE_TYPES = ['EMAIL', 'SMS', 'RCS', 'FACTURE', 'CONTRAT'];

const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-amber-100 text-amber-700',
  admin: 'bg-indigo-100 text-indigo-700',
  editor: 'bg-emerald-100 text-emerald-700',
  viewer: 'bg-slate-100 text-slate-600',
  marketing: 'bg-pink-100 text-pink-700',
};

const TYPE_STYLES: Record<string, string> = {
  EMAIL: 'bg-blue-100 text-blue-700',
  SMS: 'bg-emerald-100 text-emerald-700',
  RCS: 'bg-purple-100 text-purple-700',
  FACTURE: 'bg-amber-100 text-amber-700',
  CONTRAT: 'bg-pink-100 text-pink-700',
};

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const body = await res.json();
      msg = body?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

// ── Copy button ──
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-slate-400 hover:text-slate-700 transition-colors">
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
    </button>
  );
}

// ── New API key modal ──
function NewKeyModal({ result, onClose }: { result: NewKeyResult; onClose: () => void }) {
  const [showSecret, setShowSecret] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Key size={16} className="text-green-600" />
            </div>
            <h3 className="text-slate-900 font-semibold">Clés générées</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-amber-700 text-xs font-medium">
            ⚠️ Le client_secret est affiché UNE SEULE FOIS. Copiez-le maintenant.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-slate-500 text-[11px] font-medium uppercase tracking-wide block mb-1">Client ID</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <code className="text-slate-800 text-xs flex-1 truncate font-mono">{result.client_id}</code>
              <CopyBtn text={result.client_id} />
            </div>
          </div>
          <div>
            <label className="text-slate-500 text-[11px] font-medium uppercase tracking-wide block mb-1">Client Secret</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <code className="text-slate-800 text-xs flex-1 font-mono">
                {showSecret ? result.client_secret : '•'.repeat(32)}
              </code>
              <button onClick={() => setShowSecret((v) => !v)} className="text-slate-400 hover:text-slate-700 transition-colors">
                {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <CopyBtn text={result.client_secret} />
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-5 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
        >
          J&apos;ai copié mes clés
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Reset password modal ──
function ResetPasswordModal({
  user, onClose, onSubmit,
}: { user: UserRow; onClose: () => void; onSubmit: (pwd: string) => Promise<void> }) {
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (pwd.length < 4) { toast.error('Min. 4 caractères'); return; }
    setBusy(true);
    try { await onSubmit(pwd); onClose(); } finally { setBusy(false); }
  };
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-indigo-600" />
          <h3 className="text-slate-900 font-semibold text-sm">Réinitialiser le mot de passe</h3>
        </div>
        <p className="text-slate-500 text-xs mb-4">{user.email}</p>
        <input
          type="text"
          value={pwd}
          autoFocus
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Nouveau mot de passe"
          className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm rounded-lg transition-colors">Annuler</button>
          <button onClick={submit} disabled={busy} className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {busy ? '…' : 'Confirmer'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Map a super-admin TemplateRow onto the builder's Template shape so we can
// reuse the exact same PreviewModal (faithful per-type rendering).
function toBuilderTemplate(t: TemplateRow): Template {
  return {
    id: t.id,
    name: t.name,
    description: '',
    type: t.type,
    subject: t.subject || '',
    content: t.content || '',
    created_at: '',
    updated_at: String(t.updated_at ?? ''),
    version: 1,
    usage_count: 0,
  };
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [apiClients, setApiClients] = useState<Record<string, ApiClient[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<NewKeyResult | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRow | null>(null);

  // Which top-level tab is showing: organisations (users/templates/keys) or the
  // commandes/abonnements view.
  const [tab, setTab] = useState<'orgs' | 'orders'>('orgs');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u, tpl] = await Promise.all([
        request('/auth/admin/tenants'),
        request('/auth/admin/users'),
        request('/auth/admin/templates'),
      ]);
      setTenants(t.tenants || []);
      setUsers(u.users || []);
      setTemplates(tpl.templates || []);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadApiClients = async (tenantId: string) => {
    try {
      const data = await request(`/auth/admin/tenants/${tenantId}/api-clients`);
      setApiClients((prev) => ({ ...prev, [tenantId]: data.clients || [] }));
    } catch {
      toast.error('Erreur chargement clés');
    }
  };

  const toggle = (tenantId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) next.delete(tenantId);
      else { next.add(tenantId); if (!apiClients[tenantId]) loadApiClients(tenantId); }
      return next;
    });
  };

  const generateKey = async (tenantId: string) => {
    setGeneratingFor(tenantId);
    try {
      const result = await request(`/auth/admin/tenants/${tenantId}/api-clients`, {
        method: 'POST',
        body: JSON.stringify({ scopes: 'templates:read templates:write' }),
      });
      setNewKey(result);
      await loadApiClients(tenantId);
    } catch {
      toast.error('Erreur génération des clés');
    } finally {
      setGeneratingFor(null);
    }
  };

  const revokeKey = async (keyId: string, tenantId: string) => {
    if (!confirm('Révoquer cette clé ?')) return;
    try {
      await request(`/auth/admin/api-clients/${keyId}`, { method: 'DELETE' });
      toast.success('Clé révoquée');
      await loadApiClients(tenantId);
    } catch {
      toast.error('Erreur révocation');
    }
  };

  const changePlan = async (tenantId: string, plan: string) => {
    try {
      await request(`/auth/admin/tenants/${tenantId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan }),
      });
      setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, plan } : t)));
      toast.success('Plan mis à jour');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    }
  };

  const changeRole = async (user: UserRow, role: string) => {
    try {
      await request(`/auth/admin/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
      toast.success('Rôle mis à jour');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    }
  };

  const resetPassword = async (user: UserRow, pwd: string) => {
    try {
      await request(`/auth/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: pwd }),
      });
      toast.success('Mot de passe réinitialisé');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    }
  };

  const deleteUser = async (user: UserRow) => {
    if (!confirm(`Supprimer ${user.email} ? Cette action est irréversible.`)) return;
    try {
      await request(`/auth/admin/users/${user.id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success('Utilisateur supprimé');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    }
  };

  const deleteTemplate = async (tpl: TemplateRow) => {
    if (!confirm(`Supprimer le template "${tpl.name}" ?`)) return;
    try {
      await request(`/auth/admin/tenants/${tpl.tenant_id}/templates/${tpl.id}`, { method: 'DELETE' });
      setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
      toast.success('Template supprimé');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/super-admin');
  };

  const filtering = !!(search.trim() || roleFilter || typeFilter);
  const q = search.trim().toLowerCase();

  // Group + filter data per tenant
  const grouped = useMemo(() => {
    return tenants.map((tenant) => {
      const tenantUsers = users.filter((u) => u.tenant_id === tenant.id);
      const tenantTemplates = templates.filter((t) => t.tenant_id === tenant.id);

      const matchedUsers = tenantUsers.filter((u) => {
        if (roleFilter && u.role !== roleFilter) return false;
        if (q && !`${u.email} ${u.first_name} ${u.last_name}`.toLowerCase().includes(q)) return false;
        return true;
      });
      const matchedTemplates = tenantTemplates.filter((t) => {
        if (typeFilter && t.type !== typeFilter) return false;
        if (q && !t.name.toLowerCase().includes(q)) return false;
        return true;
      });
      const nameMatches = q ? tenant.name.toLowerCase().includes(q) : false;

      let visible = true;
      if (filtering) {
        if (roleFilter && !typeFilter) visible = matchedUsers.length > 0 || (nameMatches && !typeFilter);
        else if (typeFilter && !roleFilter) visible = matchedTemplates.length > 0 || (nameMatches && !roleFilter);
        else visible = matchedUsers.length > 0 || matchedTemplates.length > 0 || nameMatches;
      }

      return {
        tenant,
        users: tenantUsers,
        templates: tenantTemplates,
        matchedUsers,
        matchedTemplates,
        nameMatches,
        visible,
      };
    });
  }, [tenants, users, templates, q, roleFilter, typeFilter, filtering]);

  const visibleOrgs = grouped.filter((g) => g.visible);

  const isOpen = (tenantId: string) => filtering || expanded.has(tenantId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">Super Admin</h1>
            <p className="text-slate-400 text-[11px]">Panneau de contrôle global</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-xs transition-colors"
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
          {[
            { id: 'orgs' as const, label: 'Organisations', icon: Building2 },
            { id: 'orders' as const, label: 'Commandes', icon: CreditCard },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'orders' ? (
          <SubscriptionsTab />
        ) : (
        <>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Organisations', value: tenants.length, color: 'text-indigo-600', icon: Building2 },
            { label: 'Utilisateurs', value: users.length, color: 'text-emerald-600', icon: Users },
            { label: 'Templates', value: templates.length, color: 'text-blue-600', icon: FileText },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <div className={`text-2xl font-black ${s.color} mb-1`}>{s.value}</div>
                <div className="text-slate-500 text-xs">{s.label}</div>
              </div>
              <s.icon size={20} className="text-slate-200" />
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher org, email, template…"
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Tous les rôles</option>
            {ALL_ROLE_FILTERS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Tous les types</option>
            {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={loadAll}
            className="h-9 px-3 flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-xs bg-white border border-slate-300 rounded-lg transition-colors hover:bg-slate-50"
          >
            <RefreshCw size={12} /> Rafraîchir
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {visibleOrgs.length === 0 && (
              <div className="text-slate-400 text-sm text-center py-12">Aucun résultat</div>
            )}
            {visibleOrgs.map(({ tenant, users: tu, templates: tt, matchedUsers, matchedTemplates }, i) => {
              const open = isOpen(tenant.id);
              const showUsers = filtering ? matchedUsers : tu;
              const showTemplates = filtering ? matchedTemplates : tt;
              return (
                <motion.div
                  key={tenant.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
                >
                  {/* Org row */}
                  <button
                    onClick={() => toggle(tenant.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <Building2 size={15} className="text-indigo-500" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{tenant.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{tenant.id.substring(0, 16)}…</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PLAN_STYLES[tenant.plan] ?? PLAN_STYLES.free}`}>
                        {PLAN_LABELS[tenant.plan] ?? tenant.plan}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500"><Users size={11} />{tu.length}</span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500"><FileText size={11} />{tt.length}</span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100 overflow-hidden"
                      >
                        <div className="px-4 py-4 bg-slate-50/70 space-y-5">
                          {/* Plan */}
                          <div>
                            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <Shield size={11} /> Plan d&apos;abonnement
                            </div>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                              <select
                                value={PLANS.includes(tenant.plan) ? tenant.plan : 'free'}
                                onChange={(e) => changePlan(tenant.id, e.target.value)}
                                className="text-xs text-slate-800 bg-transparent outline-none cursor-pointer"
                              >
                                {PLANS.map((p) => (
                                  <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                                ))}
                              </select>
                              <span className="text-[10px] text-slate-400">
                                « Interne » = accès illimité, non facturé (nos propres organisations).
                              </span>
                            </div>
                          </div>

                          {/* Users */}
                          <div>
                            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <Users size={11} /> Utilisateurs ({showUsers.length})
                            </div>
                            {showUsers.length === 0 ? (
                              <div className="text-slate-400 text-xs py-1">Aucun utilisateur</div>
                            ) : (
                              <div className="space-y-1.5">
                                {showUsers.map((u) => {
                                  const isSuper = u.role === 'super_admin';
                                  return (
                                    <div key={u.id} className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                      <div className="min-w-0">
                                        <div className="text-slate-800 text-xs font-medium truncate">{u.email}</div>
                                        <div className="text-slate-400 text-[10px] truncate">{u.first_name} {u.last_name}</div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {isSuper ? (
                                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${ROLE_STYLES.super_admin}`}>super_admin</span>
                                        ) : (
                                          <select
                                            value={u.role}
                                            onChange={(e) => changeRole(u, e.target.value)}
                                            className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-700 focus:outline-none focus:border-indigo-500"
                                          >
                                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                          </select>
                                        )}
                                        <button onClick={() => setResetUser(u)} title="Réinitialiser le mot de passe" className="text-slate-400 hover:text-indigo-600 transition-colors">
                                          <KeyRound size={13} />
                                        </button>
                                        {!isSuper && (
                                          <button onClick={() => deleteUser(u)} title="Supprimer" className="text-slate-400 hover:text-red-600 transition-colors">
                                            <Trash2 size={13} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Templates */}
                          <div>
                            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <FileText size={11} /> Templates ({showTemplates.length})
                            </div>
                            {showTemplates.length === 0 ? (
                              <div className="text-slate-400 text-xs py-1">Aucun template</div>
                            ) : (
                              <div className="space-y-1.5">
                                {showTemplates.map((t) => (
                                  <div key={t.id} className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${TYPE_STYLES[t.type] || 'bg-slate-100 text-slate-600'}`}>{t.type}</span>
                                      <span className="text-slate-800 text-xs truncate">{t.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                      <button onClick={() => setPreviewTemplate(t)} title="Aperçu" className="text-slate-400 hover:text-slate-800 transition-colors">
                                        <Eye size={13} />
                                      </button>
                                      <button onClick={() => deleteTemplate(t)} title="Supprimer" className="text-slate-400 hover:text-red-600 transition-colors">
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* API keys */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                                <Key size={11} /> Clés API
                              </span>
                              <button
                                onClick={() => generateKey(tenant.id)}
                                disabled={generatingFor === tenant.id}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50"
                              >
                                {generatingFor === tenant.id
                                  ? <div className="w-3 h-3 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                  : <Plus size={12} />}
                                Générer
                              </button>
                            </div>
                            {!apiClients[tenant.id] ? (
                              <div className="text-slate-400 text-xs py-1">Chargement…</div>
                            ) : apiClients[tenant.id].length === 0 ? (
                              <div className="text-slate-400 text-xs py-1">Aucune clé API</div>
                            ) : (
                              <div className="space-y-1.5">
                                {apiClients[tenant.id].map((c) => (
                                  <div key={c.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Key size={12} className="text-slate-400 shrink-0" />
                                      <code className="text-slate-600 text-[11px] font-mono truncate">{c.client_id}</code>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                                      <CopyBtn text={c.client_id} />
                                      <button onClick={() => revokeKey(c.id, tenant.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
        </>
        )}
      </div>

      <AnimatePresence>
        {newKey && <NewKeyModal result={newKey} onClose={() => setNewKey(null)} />}
        {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onSubmit={(pwd) => resetPassword(resetUser, pwd)} />}
        {previewTemplate && <PreviewModal template={toBuilderTemplate(previewTemplate)} onClose={() => setPreviewTemplate(null)} />}
      </AnimatePresence>
    </div>
  );
}
