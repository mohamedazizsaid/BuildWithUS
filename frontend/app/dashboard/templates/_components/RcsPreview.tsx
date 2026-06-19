'use client';

import { MessageSquareMore, Image as ImageIcon, GalleryHorizontalEnd } from 'lucide-react';
import { parseRcs } from '../rcs-editor/_lib/rcs-serializer';

// RCS templates are stored as a JSON payload in `content`. We render a compact
// representation (chat bubble / card hint) for the list thumbnail — the same
// teal look as the RCS editor's preview, instead of the generic MJML preview.
export function RcsPreview({ content }: { content: string }) {
  const msg = parseRcs(content);
  const cardCount = msg.messageType === 'carousel' ? msg.cards.length : msg.messageType === 'card' ? 1 : 0;
  const totalSuggestions =
    msg.suggestions.length +
    (msg.messageType === 'card' ? msg.card?.suggestions.length ?? 0 : 0) +
    (msg.messageType === 'carousel' ? msg.cards.reduce((n, c) => n + c.suggestions.length, 0) : 0);

  const empty = !msg.text.trim() && cardCount === 0 && totalSuggestions === 0;

  return (
    <div className="w-full h-[180px] bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center p-4 overflow-hidden">
      {empty ? (
        <div className="flex flex-col items-center gap-2 text-teal-400">
          <MessageSquareMore size={28} className="opacity-50" />
          <span className="text-[11px]">RCS vide</span>
        </div>
      ) : (
        <div className="w-full max-w-[200px] flex flex-col items-start gap-1.5">
          {msg.text.trim() && (
            <div className="max-w-full overflow-hidden rounded-2xl rounded-bl-sm bg-teal-600 px-3 py-1.5 text-[11px] leading-snug text-white whitespace-pre-wrap break-words line-clamp-3 shadow-sm">
              {msg.text}
            </div>
          )}
          {cardCount > 0 && (
            <div className="w-full rounded-lg border border-teal-200 bg-white shadow-sm overflow-hidden">
              <div className="h-12 bg-teal-50 flex items-center justify-center text-teal-300">
                {msg.messageType === 'carousel' ? <GalleryHorizontalEnd size={18} /> : <ImageIcon size={18} />}
              </div>
              <div className="px-2 py-1.5">
                <p className="text-[11px] font-semibold text-slate-700 truncate">
                  {(msg.messageType === 'carousel' ? msg.cards[0]?.title : msg.card?.title) || 'Carte'}
                </p>
                <p className="text-[9px] text-slate-400">
                  {msg.messageType === 'carousel' ? `Carrousel · ${cardCount} cartes` : 'Carte enrichie'}
                </p>
              </div>
            </div>
          )}
          {totalSuggestions > 0 && (
            <span className="rounded-full bg-white/80 border border-teal-200 px-2 py-0.5 text-[9px] font-medium text-teal-700">
              {totalSuggestions} bouton{totalSuggestions > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
