'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Download, Plus, Trash2 } from 'lucide-react';
import { templates } from '@/lib/api';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

const INVOICE_TYPES = [
  { value: 'standard',    label: 'Standard',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'pro-forma',   label: 'Pro-forma',   color: 'bg-slate-50 text-slate-600 border-slate-200' },
  { value: 'acompte',     label: 'Acompte',     color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'solde',       label: 'Solde',       color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'avoir',       label: 'Avoir',       color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'recurrente',  label: 'Récurrente',  color: 'bg-violet-50 text-violet-700 border-violet-200' },
] as const;

const TVA_RATES = [0, 5.5, 10, 20] as const;

const PAYMENT_TERMS = [
  '30 jours',
  '45 jours',
  '60 jours',
  'À réception',
  'Comptant',
] as const;

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceData {
  invoiceType: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientSiret: string;
  lines: InvoiceLine[];
  tvaRate: number;
  notes: string;
  paymentTerms: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEur(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function formatDateFr(iso: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

// ─── Preview component ────────────────────────────────────────────────────────

function InvoicePreview({ data }: { data: InvoiceData }) {
  const subtotalHT = data.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const tvaAmount = subtotalHT * (data.tvaRate / 100);
  const totalTTC = subtotalHT + tvaAmount;

  const typeConfig = INVOICE_TYPES.find((t) => t.value === data.invoiceType) ?? INVOICE_TYPES[0];
  const typeLabel = data.invoiceType === 'pro-forma' ? 'FACTURE PRO-FORMA' : data.invoiceType === 'avoir' ? 'FACTURE D\'AVOIR' : 'FACTURE';

  return (
    <div
      id="invoice-preview"
      className="bg-white shadow-sm mx-auto print:shadow-none print:mx-0"
      style={{ width: '210mm', minHeight: '297mm', padding: '20mm', fontFamily: 'Arial, sans-serif', fontSize: '10pt', color: '#1a1a1a' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '22pt', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
            {typeLabel}
          </div>
          <div style={{ marginTop: '4px' }}>
            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '9pt', fontWeight: '600', background: '#f1f5f9', color: '#475569' }}>
              {typeConfig.label}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9pt', color: '#475569' }}>
          <div style={{ fontWeight: '700', fontSize: '11pt', color: '#0f172a' }}>{data.invoiceNumber || 'F2026-001'}</div>
          <div>Date : {formatDateFr(data.issueDate)}</div>
          <div>Échéance : {formatDateFr(data.dueDate)}</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '2px', background: '#0f172a', marginBottom: '20px' }} />

      {/* Client info */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '8pt', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '6px' }}>
          Facturé à
        </div>
        <div style={{ fontWeight: '700', fontSize: '11pt' }}>{data.clientName || '—'}</div>
        {data.clientEmail && <div style={{ color: '#475569', fontSize: '9pt' }}>{data.clientEmail}</div>}
        {data.clientAddress && <div style={{ color: '#475569', fontSize: '9pt', whiteSpace: 'pre-line' }}>{data.clientAddress}</div>}
        {data.clientSiret && <div style={{ color: '#94a3b8', fontSize: '8pt', marginTop: '2px' }}>SIRET : {data.clientSiret}</div>}
      </div>

      {/* Lines table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
        <thead>
          <tr style={{ background: '#0f172a', color: 'white' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '9pt', fontWeight: '600' }}>Description</th>
            <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '9pt', fontWeight: '600', width: '60px' }}>Qté</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '9pt', fontWeight: '600', width: '90px' }}>PU HT</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '9pt', fontWeight: '600', width: '90px' }}>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '16px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '9pt', fontStyle: 'italic' }}>
                Aucune ligne
              </td>
            </tr>
          ) : (
            data.lines.map((line, i) => (
              <tr key={line.id} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                <td style={{ padding: '8px 10px', fontSize: '9pt' }}>{line.description || '—'}</td>
                <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '9pt' }}>{line.quantity}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '9pt' }}>{formatEur(line.unitPrice)} €</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '9pt', fontWeight: '500' }}>{formatEur(line.quantity * line.unitPrice)} €</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <div style={{ width: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '9pt' }}>
            <span style={{ color: '#475569' }}>Sous-total HT</span>
            <span style={{ fontWeight: '500' }}>{formatEur(subtotalHT)} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '9pt' }}>
            <span style={{ color: '#475569' }}>TVA ({data.tvaRate}%)</span>
            <span style={{ fontWeight: '500' }}>{formatEur(tvaAmount)} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#0f172a', color: 'white', borderRadius: '4px', marginTop: '4px', fontSize: '11pt', fontWeight: '700' }}>
            <span>Total TTC</span>
            <span>{formatEur(totalTTC)} €</span>
          </div>
        </div>
      </div>

      {/* Payment terms + notes */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', fontSize: '9pt', color: '#475569' }}>
        <div><strong>Modalités de paiement :</strong> {data.paymentTerms}</div>
        {data.notes && <div style={{ marginTop: '8px', whiteSpace: 'pre-line' }}>{data.notes}</div>}
        {data.tvaRate === 0 && (
          <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#94a3b8' }}>
            TVA non applicable — article 293 B du CGI
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editor content ───────────────────────────────────────────────────────────

function InvoiceEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const templateId = searchParams.get('id') || null;
  const name = searchParams.get('name') || 'Nouvelle facture';
  const description = searchParams.get('description') || '';
  const isEditMode = !!templateId;

  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<InvoiceData>({
    invoiceType: 'standard',
    invoiceNumber: `F${new Date().getFullYear()}-001`,
    issueDate: todayStr(),
    dueDate: defaultDueDate(),
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    clientSiret: '',
    lines: [{ id: uuid(), description: '', quantity: 1, unitPrice: 0 }],
    tvaRate: 20,
    notes: '',
    paymentTerms: '30 jours',
  });

  // Load existing template when editing
  useEffect(() => {
    if (!templateId) return;
    templates.get(templateId)
      .then((result: any) => {
        const t = result?.template ?? result;
        try {
          const parsed = JSON.parse(t?.content ?? '');
          if (parsed.invoiceType) setData(parsed);
        } catch { /* not JSON — keep defaults */ }
      })
      .catch(() => {});
  }, [templateId]);

  const set = useCallback(<K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addLine = () => {
    setData((prev) => ({
      ...prev,
      lines: [...prev.lines, { id: uuid(), description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeLine = (id: string) => {
    setData((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== id) }));
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: string | number) => {
    setData((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const content = JSON.stringify(data);
    try {
      if (isEditMode && templateId) {
        await templates.update(templateId, { name, description, type: 2, content });
        toast.success('Facture mise à jour');
      } else {
        await templates.create({ name, description, type: 2, content });
        toast.success('Facture enregistrée');
      }
      router.push('/dashboard/templates');
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const subtotalHT = data.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const tvaAmount = subtotalHT * (data.tvaRate / 100);
  const totalTTC = subtotalHT + tvaAmount;

  const currentTypeConfig = INVOICE_TYPES.find((t) => t.value === data.invoiceType) ?? INVOICE_TYPES[0];

  const handleExportPDF = async () => {
    const previewEl = document.getElementById('invoice-preview');
    if (!previewEl) return;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${name}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    table { border-collapse: collapse; }
  </style>
</head>
<body>${previewEl.outerHTML}</body>
</html>`;

    const toastId = toast.loading('Génération du PDF...');
    try {
      const res = await fetch('http://localhost:3000/templates/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ html, name }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé', { id: toastId });
    } catch {
      toast.error('Erreur lors de la génération du PDF', { id: toastId });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 flex-shrink-0 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            Retour
          </button>
          <div className="w-px h-4 bg-border" />
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${currentTypeConfig.color}`}>
            {currentTypeConfig.label}
          </span>
        </div>

        <span className="text-sm font-medium text-foreground/80 truncate max-w-xs">{name}</span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Download size={13} />
            Exporter PDF
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Save size={13} />
            {isSaving ? 'Enregistrement...' : isEditMode ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Split layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — form (45%) */}
        <div className="w-[45%] flex flex-col border-r border-border overflow-y-auto print:hidden bg-white">
          <div className="p-5 space-y-5">

            {/* Invoice type */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Type de facture
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {INVOICE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => set('invoiceType', t.value)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                      data.invoiceType === t.value ? t.color + ' ring-1 ring-offset-0' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoice info */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Informations
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">N° Facture</label>
                  <input
                    value={data.invoiceNumber}
                    onChange={(e) => set('invoiceNumber', e.target.value)}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Date d&apos;émission</label>
                  <input
                    type="date"
                    value={data.issueDate}
                    onChange={(e) => set('issueDate', e.target.value)}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Date d&apos;échéance</label>
                  <input
                    type="date"
                    value={data.dueDate}
                    onChange={(e) => set('dueDate', e.target.value)}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Modalités paiement</label>
                  <select
                    value={data.paymentTerms}
                    onChange={(e) => set('paymentTerms', e.target.value)}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {PAYMENT_TERMS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Client */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Client
              </label>
              <div className="space-y-2">
                <input
                  value={data.clientName}
                  onChange={(e) => set('clientName', e.target.value)}
                  placeholder="Nom / Raison sociale"
                  className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <input
                  value={data.clientEmail}
                  onChange={(e) => set('clientEmail', e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <textarea
                  value={data.clientAddress}
                  onChange={(e) => set('clientAddress', e.target.value)}
                  placeholder="Adresse (rue, code postal, ville)"
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                />
                <input
                  value={data.clientSiret}
                  onChange={(e) => set('clientSiret', e.target.value)}
                  placeholder="SIRET (optionnel, B2B)"
                  className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Lines */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Lignes de facturation
              </label>
              <div className="space-y-1.5">
                {/* Header */}
                <div className="grid grid-cols-[1fr_48px_80px_24px] gap-1 px-1">
                  <span className="text-[10px] text-muted-foreground">Description</span>
                  <span className="text-[10px] text-muted-foreground text-center">Qté</span>
                  <span className="text-[10px] text-muted-foreground text-right">PU HT (€)</span>
                  <span />
                </div>
                {data.lines.map((line) => (
                  <div key={line.id} className="grid grid-cols-[1fr_48px_80px_24px] gap-1 items-center">
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, 'quantity', Math.max(0, Number(e.target.value)))}
                      className="h-7 px-1 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900 text-center"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.id, 'unitPrice', Math.max(0, Number(e.target.value)))}
                      className="h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900 text-right"
                    />
                    <button
                      onClick={() => removeLine(line.id)}
                      disabled={data.lines.length === 1}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addLine}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                >
                  <Plus size={12} />
                  Ajouter une ligne
                </button>
              </div>
            </div>

            {/* TVA */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Taux de TVA
              </label>
              <div className="flex gap-1.5">
                {TVA_RATES.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => set('tvaRate', rate)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      data.tvaRate === rate
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Totals recap */}
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total HT</span>
                <span className="font-medium text-foreground">{formatEur(subtotalHT)} €</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>TVA ({data.tvaRate}%)</span>
                <span className="font-medium text-foreground">{formatEur(tvaAmount)} €</span>
              </div>
              <div className="flex justify-between font-semibold text-sm pt-1 border-t border-slate-200">
                <span>Total TTC</span>
                <span>{formatEur(totalTTC)} €</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Notes / Mentions légales
              </label>
              <textarea
                value={data.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Informations bancaires, conditions supplémentaires..."
                rows={3}
                className="w-full px-2.5 py-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
              />
            </div>

          </div>
        </div>

        {/* Right — A4 preview (55%) */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6 print:w-full print:p-0 print:bg-white print:overflow-visible">
          <div className="flex items-center mb-4 print:hidden">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Aperçu</span>
          </div>
          <InvoicePreview data={data} />
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:w-full { width: 100% !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:overflow-visible { overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}

export default function InvoiceEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InvoiceEditorContent />
    </Suspense>
  );
}
