'use client';

import { FileText } from 'lucide-react';
import { deserialize } from '@/lib/invoice/serialize';
import { renderInvoiceHtml } from '@/lib/invoice/renderer';

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

  // Render the real PDF-bound HTML and scale it down. The invoice root is
  // 210mm wide; at scale 0.30 it fits comfortably inside a ~252px card.
  const fullHtml = (() => {
    try { return renderInvoiceHtml(invoice); } catch { return ''; }
  })();
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/);
  const headMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  const inlineCss = headMatch ? headMatch[1] : '';
  const bodyHtml = bodyMatch ? bodyMatch[1] : '';

  const typeLabel = TYPE_LABELS[invoice.data.type] || 'Standard';

  if (!bodyHtml) {
    return (
      <div className="w-full h-[180px] bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
        <FileText size={32} className="text-emerald-400 opacity-40" />
      </div>
    );
  }

  return (
    <div className="w-full h-[180px] bg-white relative overflow-hidden">
      <div
        className="origin-top-left absolute top-0 left-0"
        style={{
          transform: 'scale(0.30)',
          width: '333%',
          height: '333%',
          pointerEvents: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: `<style>${inlineCss}</style>${bodyHtml}` }}
      />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/70 to-transparent pointer-events-none" />
      <div className="absolute top-2.5 right-2.5 z-10">
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
          {typeLabel}
        </span>
      </div>
    </div>
  );
}
