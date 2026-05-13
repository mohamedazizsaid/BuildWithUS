'use client';

import { ScrollText } from 'lucide-react';
import { tiptapDocToPreviewHtml } from '../_lib/preview-helpers';

export function ContractPreview({ content }: { content: string }) {
  const typeLabels: Record<string, string> = { b2c: 'B2C', b2b: 'B2B', web: 'Web', aop: 'AOP', abonnement: 'Abonnement' };

  try {
    const data = JSON.parse(content);
    const contractType = data.contractType || 'b2c';

    if (data.doc?.type === 'doc') {
      const html = tiptapDocToPreviewHtml(data.doc);
      if (html) {
        return (
          <div className="w-full h-[180px] overflow-hidden bg-white relative">
            <div
              className="origin-top-left absolute top-0 left-0"
              style={{
                transform: 'scale(0.32)',
                width: '313%',
                height: '313%',
                pointerEvents: 'none',
                padding: '8mm 12mm 0',
                fontFamily: 'Arial, sans-serif',
                fontSize: '10pt',
                color: '#1a1a1a',
                lineHeight: 1.6,
                background: 'white',
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/70 to-transparent pointer-events-none" />
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shadow-sm">
                {typeLabels[contractType] || contractType.toUpperCase()}
              </span>
            </div>
          </div>
        );
      }
    }

    const blocks: { type: string; content: string }[] = data.blocks || [];
    const heading = blocks.find((b) => b.type === 'contract_header' || b.type === 'heading');
    const articles = blocks.filter((b) => b.type === 'article' || b.type === 'legal_article').slice(0, 3);

    const title = heading?.content
      ?.split('\n')[0]
      ?.replaceAll(/\{\{[\w]+\}\}/g, '...')
      ?.substring(0, 40) || 'Contrat';

    return (
      <div className="w-full h-[180px] bg-[#0f172a] relative overflow-hidden flex flex-col p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Document légal</span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
            {typeLabels[contractType] || contractType.toUpperCase()}
          </span>
        </div>
        <div className="text-white text-[11px] font-bold leading-tight mb-3 line-clamp-2">{title}</div>
        <div className="flex flex-col gap-1.5 flex-1">
          {articles.map((_a, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-white/10 flex items-center justify-center shrink-0">
                <span className="text-[7px] text-white/40 font-bold">{i + 1}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full flex-1" style={{ width: `${60 + i * 10}%` }} />
            </div>
          ))}
          {articles.length === 0 && (
            <div className="flex flex-col gap-1.5">
              {[80, 65, 75, 55].map((w, i) => (
                <div key={i} className="h-1.5 bg-white/10 rounded-full" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0f172a] to-transparent" />
      </div>
    );
  } catch {
    return (
      <div className="w-full h-[180px] bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
        <ScrollText size={32} className="text-amber-400 opacity-40" />
      </div>
    );
  }
}
