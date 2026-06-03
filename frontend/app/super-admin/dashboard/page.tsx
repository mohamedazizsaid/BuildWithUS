'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Building2, Key, Trash2, Plus, Copy, Check,
  LogOut, RefreshCw, X, Eye, EyeOff,
} from 'lucide-react';
import { auth } from '@/lib/api';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Tenant {
  id: string;
  name: string;
  plan: string;
  created_at: string;
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

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) throw new Error('Request failed');
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
    <button onClick={copy} className="text-white/40 hover:text-white transition-colors">
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

// ── New key modal ──
function NewKeyModal({ result, onClose }: { result: NewKeyResult; onClose: () => void }) {
  const [showSecret, setShowSecret] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#13131a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Key size={16} className="text-green-400" />
            </div>
            <h3 className="text-white font-semibold">Clés générées</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
          <p className="text-amber-400 text-xs font-medium">
            ⚠️ Le client_secret est affiché UNE SEULE FOIS. Copiez-le maintenant.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-white/40 text-[11px] font-medium uppercase tracking-wide block mb-1">Client ID</label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <code className="text-white text-xs flex-1 truncate font-mono">{result.client_id}</code>
              <CopyBtn text={result.client_id} />
            </div>
          </div>
          <div>
            <label className="text-white/40 text-[11px] font-medium uppercase tracking-wide block mb-1">Client Secret</label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <code className="text-white text-xs flex-1 font-mono">
                {showSecret ? result.client_secret : '•'.repeat(32)}
              </code>
              <button onClick={() => setShowSecret((v) => !v)} className="text-white/40 hover:text-white transition-colors">
                {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <CopyBtn text={result.client_secret} />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 h-10 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-colors"
        >
          J&apos;ai copié mes clés
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [apiClients, setApiClients] = useState<Record<string, ApiClient[]>>({});
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<NewKeyResult | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    try {
      const data = await request('/auth/admin/tenants');
      setTenants(data.tenants || []);
    } catch {
      toast.error('Erreur chargement tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const loadApiClients = async (tenantId: string) => {
    try {
      const data = await request(`/auth/admin/tenants/${tenantId}/api-clients`);
      setApiClients((prev) => ({ ...prev, [tenantId]: data.clients || [] }));
    } catch {
      toast.error('Erreur chargement clés');
    }
  };

  const toggleTenant = async (tenantId: string) => {
    if (expandedTenant === tenantId) {
      setExpandedTenant(null);
      return;
    }
    setExpandedTenant(tenantId);
    if (!apiClients[tenantId]) await loadApiClients(tenantId);
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
    if (!confirm('Révoquer cette clé ? Le client ne pourra plus s\'authentifier.')) return;
    try {
      await request(`/auth/admin/api-clients/${keyId}`, { method: 'DELETE' });
      toast.success('Clé révoquée');
      await loadApiClients(tenantId);
    } catch {
      toast.error('Erreur révocation');
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/super-admin');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0d0d14] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Super Admin</h1>
            <p className="text-white/30 text-[11px]">Panneau de contrôle — Ahmed Boughdiri</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs transition-colors"
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Tenants actifs', value: tenants.length, color: 'text-indigo-400' },
            { label: 'Clés API total', value: Object.values(apiClients).flat().length, color: 'text-emerald-400' },
            { label: 'Rôle', value: 'Super Admin', color: 'text-amber-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <div className={`text-2xl font-black ${s.color} mb-1`}>{s.value}</div>
              <div className="text-white/40 text-xs">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tenants list */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/80">Tenants & Clés API</h2>
          <button
            onClick={loadTenants}
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs transition-colors"
          >
            <RefreshCw size={12} />
            Rafraîchir
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {tenants.map((tenant, i) => (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden"
              >
                {/* Tenant row */}
                <button
                  onClick={() => toggleTenant(tenant.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Building2 size={15} className="text-white/50" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">{tenant.name}</div>
                      <div className="text-[11px] text-white/30 font-mono">{tenant.id.substring(0, 16)}…</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      tenant.plan === 'pro' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/30'
                    }`}>
                      {tenant.plan}
                    </span>
                    <span className="text-white/20 text-xs">{expandedTenant === tenant.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* API Keys panel */}
                <AnimatePresence>
                  {expandedTenant === tenant.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/5 overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-black/20">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] text-white/40 font-medium uppercase tracking-wide">Clés API</span>
                          <button
                            onClick={() => generateKey(tenant.id)}
                            disabled={generatingFor === tenant.id}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                          >
                            {generatingFor === tenant.id ? (
                              <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            Générer une clé
                          </button>
                        </div>

                        {!apiClients[tenant.id] ? (
                          <div className="text-white/20 text-xs py-2">Chargement…</div>
                        ) : apiClients[tenant.id].length === 0 ? (
                          <div className="text-white/20 text-xs py-2">Aucune clé API</div>
                        ) : (
                          <div className="space-y-2">
                            {apiClients[tenant.id].map((client) => (
                              <div key={client.id} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Key size={12} className="text-white/30 shrink-0" />
                                  <code className="text-white/60 text-[11px] font-mono truncate">{client.client_id}</code>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[10px] text-white/20">{new Date(client.created_at).toLocaleDateString('fr-FR')}</span>
                                  <CopyBtn text={client.client_id} />
                                  <button
                                    onClick={() => revokeKey(client.id, tenant.id)}
                                    className="text-red-400/50 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New key modal */}
      <AnimatePresence>
        {newKey && <NewKeyModal result={newKey} onClose={() => setNewKey(null)} />}
      </AnimatePresence>
    </div>
  );
}
