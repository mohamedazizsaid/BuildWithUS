'use client';

import { MessageSquare } from 'lucide-react';

// SMS templates are stored as plain text in `content`. We render that text in a
// chat bubble — the same look as the SMS editor's "Aperçu" panel — instead of
// the generic MJML/skeleton preview the other types use.
export function SmsPreview({ content }: { content: string }) {
  const text = content?.trim() ?? '';

  return (
    <div className="w-full h-[180px] bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center p-4 overflow-hidden">
      {text ? (
        <div className="max-w-full max-h-full overflow-hidden rounded-2xl rounded-bl-sm bg-violet-600 px-3.5 py-2 text-[11px] leading-relaxed text-white whitespace-pre-wrap break-words line-clamp-6 shadow-sm">
          {text}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-violet-400">
          <MessageSquare size={28} className="opacity-50" />
          <span className="text-[11px]">SMS vide</span>
        </div>
      )}
    </div>
  );
}
