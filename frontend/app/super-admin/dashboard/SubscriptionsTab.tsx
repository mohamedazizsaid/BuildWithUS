'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, RefreshCw, Search, CreditCard, Users2, Wallet, AlertTriangle,
  Calendar, Copy, Check,
} from 'lucide-react';
import toast from '@/lib/toast';
import { PLAN_LABELS, VAT_RATE, type PlanId } from '@/lib/plans';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// Mirrors the shape returned by GET /auth/admin/subscriptions.
interface LiveStripe {
  status: string | null;
  current_period_end: number | null; // unix seconds
  cancel_at_period_end: boolean;
  amount: number | null; // cents, HT (tax added at checkout)
  currency: string;
  interval: string | null;
}
interface SubscriptionRow {
  tenant_id: string;
  tenant_name: string;
  plan: string;
  billing_cycle: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string | null;
  live: LiveStripe | null;
}

async function request(path: string) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { const b = await res.json(); msg = b?.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

// ── Formatting helpers ──
const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/** Monthly TTC amount (cents) for a row, or null if unknown. Prices are HT.
 *  Annual subscriptions charge the whole year up front, so their amount is a
 *  yearly figure — divide by 12 to get the monthly-recurring contribution for MRR. */
function monthlyTtcCents(row: SubscriptionRow): number | null {
  if (row.live?.amount == null) return null;
  const monthlyHt = row.live.interval === 'year' ? row.live.amount / 12 : row.live.amount;
  return Math.round(monthlyHt * (1 + VAT_RATE));
}

function cycleLabel(row: SubscriptionRow): string {
  const c = row.billing_cycle;
  if (c === 'annual') return 'Annuel (engagt. 12 mois)';
  if (c === 'monthly') return 'Mensuel';
  return '—';
}

function fmtDate(unixSeconds: number | null): string {
  if (!unixSeconds) return '—';
  return new Date(unixSeconds * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Status badge ──
const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' },
  trialing: { label: 'Essai', cls: 'bg-blue-100 text-blue-700' },
  past_due: { label: 'Impayé', cls: 'bg-red-100 text-red-700' },
  unpaid: { label: 'Impayé', cls: 'bg-red-100 text-red-700' },
  canceled: { label: 'Annulé', cls: 'bg-slate-100 text-slate-500' },
  incomplete: { label: 'Incomplet', cls: 'bg-amber-100 text-amber-700' },
  incomplete_expired: { label: 'Expiré', cls: 'bg-slate-100 text-slate-500' },
};

function StatusBadge({ row }: { row: SubscriptionRow }) {
  const status = row.live?.status ?? row.subscription_status ?? null;
  if (!status) {
    return <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500">Aucun</span>;
  }
  const meta = STATUS_META[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}>{meta.label}</span>
      {row.live?.cancel_at_period_end && (
        <span className="text-[9px] text-amber-600">se termine à échéance</span>
      )}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-slate-400 hover:text-slate-700 transition-colors"
      title="Copier l'ID"
    >
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
    </button>
  );
}

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export function SubscriptionsTab() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request('/auth/admin/subscriptions');
      setRows(data.subscriptions || []);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Only tenants that represent an actual order/subscription (a paid plan or a
  // Stripe subscription). 'free' tenants with no Stripe id are not "commandes".
  const orders = useMemo(
    () => rows.filter((r) => r.stripe_subscription_id || (r.plan && r.plan !== 'free')),
    [rows],
  );

  // KPIs
  const kpis = useMemo(() => {
    let activeCount = 0;
    let mrrCents = 0;
    let pastDue = 0;
    for (const r of orders) {
      const status = r.live?.status ?? r.subscription_status ?? '';
      if (ACTIVE_STATUSES.has(status)) {
        activeCount += 1;
        const ttc = monthlyTtcCents(r);
        if (ttc != null) mrrCents += ttc;
      }
      if (status === 'past_due' || status === 'unpaid') pastDue += 1;
    }
    return { activeCount, mrrCents, pastDue };
  }, [orders]);

  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () => orders.filter((r) => {
      const status = r.live?.status ?? r.subscription_status ?? '';
      if (statusFilter && status !== statusFilter) return false;
      if (q && !r.tenant_name.toLowerCase().includes(q)) return false;
      return true;
    }),
    [orders, q, statusFilter],
  );

  const kpiCards = [
    { label: 'Abonnés actifs', value: String(kpis.activeCount), icon: Users2, color: 'text-emerald-600' },
    { label: 'Revenu mensuel (TTC)', value: euros(kpis.mrrCents), icon: Wallet, color: 'text-indigo-600' },
    { label: 'Impayés', value: String(kpis.pastDue), icon: AlertTriangle, color: kpis.pastDue > 0 ? 'text-red-600' : 'text-slate-400' },
  ];

  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {kpiCards.map((s) => (
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
            placeholder="Rechercher une organisation…"
            className="w-full h-9 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Active</option>
          <option value="trialing">Essai</option>
          <option value="past_due">Impayé</option>
          <option value="canceled">Annulé</option>
        </select>
        <button
          onClick={load}
          className="h-9 px-3 flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-xs bg-white border border-slate-300 rounded-lg transition-colors hover:bg-slate-50"
        >
          <RefreshCw size={12} /> Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-slate-400 text-sm text-center py-12">Aucune commande</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="text-left font-semibold px-4 py-3">Organisation</th>
                  <th className="text-left font-semibold px-4 py-3">Plan</th>
                  <th className="text-left font-semibold px-4 py-3">Cycle</th>
                  <th className="text-left font-semibold px-4 py-3">Statut</th>
                  <th className="text-left font-semibold px-4 py-3">Prochain paiement</th>
                  <th className="text-right font-semibold px-4 py-3">Montant / mois</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const ttc = monthlyTtcCents(r);
                  return (
                    <motion.tr
                      key={r.tenant_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.25) }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <Building2 size={13} className="text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-slate-900 font-medium truncate">{r.tenant_name}</div>
                            {r.stripe_subscription_id && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                <span className="truncate">{r.stripe_subscription_id}</span>
                                <CopyBtn text={r.stripe_subscription_id} />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <CreditCard size={13} className="text-slate-400" />
                          {PLAN_LABELS[r.plan as PlanId] ?? r.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{cycleLabel(r)}</td>
                      <td className="px-4 py-3"><StatusBadge row={r} /></td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {fmtDate(r.live?.current_period_end ?? null)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {ttc != null ? (
                          <div>
                            <div className="text-slate-900 font-semibold">{euros(ttc)}</div>
                            <div className="text-[10px] text-slate-400">TTC</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
