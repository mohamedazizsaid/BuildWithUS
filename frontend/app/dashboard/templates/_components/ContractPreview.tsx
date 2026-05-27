'use client';

import { useEffect, useRef, useState } from 'react';
import { ScrollText, FileText } from 'lucide-react';
import { tiptapDocToPreviewHtml } from '../_lib/preview-helpers';

export function ContractPreview({ content }: { content: string }) {
  const typeLabels: Record<string, string> = { b2c: 'B2C', b2b: 'B2B', web: 'Web', aop: 'AOP', abonnement: 'Abonnement' };

  try {
    const data = JSON.parse(content);

    // PDF-template contracts store an uploaded PDF instead of TipTap/blocks.
    if (data.kind === 'pdf-template' && typeof data.pdfUrl === 'string') {
      return <PdfThumb pdfUrl={data.pdfUrl} fileName={data.pdfFileName} />;
    }

    const contractType = data.contractType || 'b2c';
    const bgColor = typeof data.docBgColor === 'string' ? data.docBgColor : '#ffffff';
    const floatingImages = Array.isArray(data.floatingImages) ? data.floatingImages : [];
    const floatingSignatures = Array.isArray(data.floatingSignatures) ? data.floatingSignatures : [];

    if (data.doc?.type === 'doc') {
      const html = tiptapDocToPreviewHtml(data.doc, { bgColor, floatingImages, floatingSignatures });
      if (html) {
        return (
          <div className="w-full h-[180px] overflow-hidden relative" style={{ background: bgColor }}>
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
                background: bgColor,
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-14 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${bgColor}, ${bgColor}b3 50%, transparent)` }}
            />
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

/** Renders the first page of an uploaded PDF as a card thumbnail. */
function PdfThumb({ pdfUrl, fileName }: { pdfUrl: string; fileName?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const doc = await pdfjs.getDocument(pdfUrl).promise;
        const page = await doc.getPage(1);
        if (cancelled) { await doc.destroy(); return; }

        const canvas = canvasRef.current;
        if (!canvas) { await doc.destroy(); return; }

        const targetWidth = 320;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: targetWidth / base.width });
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) { await doc.destroy(); return; }

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        await doc.destroy();
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfUrl]);

  if (failed) {
    return (
      <div className="w-full h-[180px] bg-gradient-to-br from-slate-100 to-slate-50 flex flex-col items-center justify-center gap-2">
        <FileText size={32} className="text-slate-400 opacity-50" />
        {fileName && <span className="text-[10px] text-slate-400 px-3 truncate max-w-full">{fileName}</span>}
      </div>
    );
  }

  return (
    <div className="w-full h-[180px] overflow-hidden relative bg-white">
      {/* w-full + h-auto on a block (not flex) keeps the page's true aspect
          ratio; the container crops the bottom and the fade hides the cut. */}
      <canvas ref={canvasRef} className="block w-full h-auto" />
      <div className="absolute inset-x-0 bottom-0 h-14 pointer-events-none bg-gradient-to-t from-white via-white/70 to-transparent" />
      <div className="absolute top-2.5 right-2.5 z-10">
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 shadow-sm">PDF</span>
      </div>
    </div>
  );
}
