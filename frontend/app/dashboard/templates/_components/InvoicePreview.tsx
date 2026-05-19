'use client';

import { FileText } from 'lucide-react';
import { deserialize } from '@/lib/invoice/serialize';
import { computeTotals, formatMoney, lineSubtotalHT } from '@/lib/invoice/compute';
import { renderTextWithPills } from '@/lib/invoice/variables';

const TYPE_LABELS: Record<string, string> = {
  standard: 'Standard', 'pro-forma': 'Pro-forma',
  acompte: 'Acompte', solde: 'Solde', avoir: 'Avoir', recurrente: 'Récurrente',
};

export function InvoicePreview({ content }: { content: string }) {
  // `deserialize` normalizes both legacy v1 and current v2 payloads, so the
  // thumbnail keeps working for older templates saved before the schema bump.
  const invoice = (() => {
    try { return deserialize(content); } catch { return null; }
  })();

  if (!invoice) {
    return (
      <div className="w-full h-[180px] bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
        <FileText size={32} className="text-emerald-400 opacity-40" />
      </div>
    );
  }

  const { data, theme } = invoice;
  const totals = computeTotals(data);
  const clientName = data.client.name?.trim();
  const number = data.number?.trim() || 'F2026-001';

  return (
    <div className="w-full h-[180px] bg-white relative overflow-hidden p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-[13px] font-black" style={{ color: theme.colors.primary }}>FACTURE</div>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            {TYPE_LABELS[data.type] || 'Standard'}
          </span>
        </div>
        <div className="text-right">
          <div
            className="text-[10px] font-bold text-slate-700 invoice-preview-text"
            dangerouslySetInnerHTML={{ __html: renderTextWithPills(number) }}
          />
          {data.issueDate && <div className="text-[9px] text-slate-400">{data.issueDate}</div>}
        </div>
      </div>
      <div className="h-px mb-2" style={{ background: theme.colors.primary }} />
      {clientName && (
        <div className="text-[9px] text-slate-500 mb-2 truncate">
          <span
            className="font-semibold text-slate-700 invoice-preview-text"
            dangerouslySetInnerHTML={{ __html: renderTextWithPills(clientName) }}
          />
        </div>
      )}
      <div className="flex flex-col gap-1 mb-2">
        {data.lines.slice(0, 2).map((l) => (
          <div key={l.id} className="flex justify-between text-[9px]">
            <span
              className="text-slate-500 truncate flex-1 invoice-preview-text"
              dangerouslySetInnerHTML={{ __html: renderTextWithPills(l.description || '—') }}
            />
            <span className="text-slate-700 font-medium ml-2">{formatMoney(lineSubtotalHT(l), data.currency)}</span>
          </div>
        ))}
      </div>
      {totals.totalTTC > 0 && (
        <div className="absolute bottom-3 right-3 text-white px-2 py-1 rounded-md text-[10px] font-bold" style={{ background: theme.colors.primary }}>
          {formatMoney(totals.totalTTC, data.currency)} TTC
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
      <style>{`
        .invoice-preview-text .invoice-var {
          display: inline-block;
          padding: 0 3px;
          border-radius: 2px;
          background: #dbeafe;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          font-size: 0.85em;
          font-weight: 700;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          line-height: 1.2;
        }
      `}</style>
    </div>
  );
}
