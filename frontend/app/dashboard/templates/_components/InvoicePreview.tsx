'use client';

import { FileText } from 'lucide-react';

type InvoiceData = {
  invoiceType?: string;
  invoiceNumber?: string;
  issueDate?: string;
  clientName?: string;
  tvaRate?: number;
  lines?: { description: string; quantity: number; unitPrice: number }[];
};

function parseInvoice(content: string): InvoiceData | null {
  try {
    return JSON.parse(content) as InvoiceData;
  } catch {
    return null;
  }
}

export function InvoicePreview({ content }: { content: string }) {
  const data = parseInvoice(content);

  if (!data) {
    return (
      <div className="w-full h-[180px] bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
        <FileText size={32} className="text-emerald-400 opacity-40" />
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    standard: 'Standard', 'pro-forma': 'Pro-forma',
    acompte: 'Acompte', solde: 'Solde', avoir: 'Avoir', recurrente: 'Récurrente',
  };
  const lines = data.lines || [];
  const subtotalHT = lines.reduce((s, l) => s + (l.quantity || 1) * (l.unitPrice || 0), 0);
  const tva = subtotalHT * ((data.tvaRate || 20) / 100);
  const ttc = subtotalHT + tva;
  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="w-full h-[180px] bg-white relative overflow-hidden p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-[13px] font-black text-slate-900">FACTURE</div>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            {typeLabels[data.invoiceType ?? ''] || 'Standard'}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-slate-700">{data.invoiceNumber || 'F2026-001'}</div>
          <div className="text-[9px] text-slate-400">{data.issueDate || ''}</div>
        </div>
      </div>
      <div className="h-px bg-slate-900 mb-2" />
      {data.clientName && (
        <div className="text-[9px] text-slate-500 mb-2 truncate">
          <span className="font-semibold text-slate-700">{data.clientName}</span>
        </div>
      )}
      <div className="flex flex-col gap-1 mb-2">
        {lines.slice(0, 2).map((l, i) => (
          <div key={i} className="flex justify-between text-[9px]">
            <span className="text-slate-500 truncate flex-1">{l.description || '—'}</span>
            <span className="text-slate-700 font-medium ml-2">{fmt(l.quantity * l.unitPrice)} €</span>
          </div>
        ))}
      </div>
      {ttc > 0 && (
        <div className="absolute bottom-3 right-3 bg-slate-900 text-white px-2 py-1 rounded-md text-[10px] font-bold">
          {fmt(ttc)} € TTC
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}
