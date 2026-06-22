'use client';

import { mjmlToPreviewHtml, isRawHtml } from '../_lib/preview-helpers';
import { getTypeConfig } from '../_lib/types';
import { HtmlFrame } from '@/components/HtmlFrame';

export function TemplatePreview({ content, type }: { content: string; type: string }) {
  const config = getTypeConfig(type);
  const Icon = config.icon;

  // Imported raw HTML renders straight in a sandboxed iframe (the MJML
  // pipeline can't parse it). Same scaled-thumbnail framing as the MJML path.
  if (isRawHtml(content)) {
    return (
      <div className="w-full h-[180px] overflow-hidden bg-white relative">
        <HtmlFrame
          html={content}
          className="origin-top-left absolute top-0 left-0"
          style={{ transform: 'scale(0.45)', width: '222%', height: '400%', pointerEvents: 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80 pointer-events-none" />
      </div>
    );
  }

  const previewHtml = content ? mjmlToPreviewHtml(content) : '';

  if (previewHtml) {
    return (
      <div className="w-full h-[180px] overflow-hidden bg-white relative">
        <div
          className="origin-top-left absolute top-0 left-0"
          style={{ transform: 'scale(0.45)', width: '222%', height: '222%', pointerEvents: 'none' }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className={`w-full h-[180px] bg-gradient-to-br ${config.gradient} flex flex-col items-center justify-center gap-3`}>
      <Icon size={32} className={`${config.color} opacity-40`} />
      <div className="space-y-1.5 w-2/3">
        <div className={`h-2 rounded-full ${config.bg} opacity-60`} />
        <div className={`h-2 rounded-full ${config.bg} opacity-40 w-3/4`} />
        <div className={`h-2 rounded-full ${config.bg} opacity-30 w-1/2`} />
      </div>
    </div>
  );
}
