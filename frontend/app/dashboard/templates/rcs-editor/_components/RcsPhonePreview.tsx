'use client';

import React from 'react';
import { MessageSquareMore, ExternalLink, Phone, CornerUpLeft, ImageIcon } from 'lucide-react';
import { RcsMessage, RcsCard, RcsSuggestion, RcsMediaHeight } from '../_lib/rcs-types';

const MEDIA_PX: Record<RcsMediaHeight, number> = { short: 96, medium: 150, tall: 220 };

function SuggestionChip({ s }: { s: RcsSuggestion }) {
  const Icon = s.type === 'openUrl' ? ExternalLink : s.type === 'dial' ? Phone : CornerUpLeft;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-teal-300 bg-white px-2.5 py-1 text-[11px] font-medium text-teal-700 shadow-sm">
      <Icon size={11} />
      <span className="truncate max-w-[120px]">{s.text || 'Bouton'}</span>
    </span>
  );
}

function CardView({ card, orientation, width }: { card: RcsCard; orientation: 'vertical' | 'horizontal'; width: 'small' | 'medium' }) {
  const horizontal = orientation === 'horizontal';
  const hasMedia = !!card.media?.url;
  const mediaStyle: React.CSSProperties = horizontal
    ? { width: 96, height: 96, flexShrink: 0 }
    : { width: '100%', height: MEDIA_PX[card.media?.height ?? 'medium'] };

  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      style={{ width: width === 'small' ? 180 : 232 }}
    >
      <div className={horizontal ? 'flex' : ''}>
        {/* Media */}
        <div className="bg-slate-100 flex items-center justify-center overflow-hidden" style={mediaStyle}>
          {hasMedia ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.media!.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={22} className="text-slate-300" />
          )}
        </div>
        {/* Text */}
        <div className="p-2.5 min-w-0 flex-1">
          {card.title && <p className="text-[13px] font-semibold text-slate-800 leading-snug break-words">{card.title}</p>}
          {card.description && <p className="mt-0.5 text-[11px] text-slate-500 leading-snug break-words whitespace-pre-wrap">{card.description}</p>}
          {card.suggestions.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {card.suggestions.map((s, i) => (
                <span key={i} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-teal-700">
                  {s.type === 'openUrl' ? <ExternalLink size={11} /> : s.type === 'dial' ? <Phone size={11} /> : <CornerUpLeft size={11} />}
                  <span className="truncate">{s.text || 'Bouton'}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RcsPhonePreview({ message, senderName }: { message: RcsMessage; senderName: string }) {
  const { messageType, text, suggestions, card, cards, cardOrientation, cardWidth } = message;

  const hasContent =
    (messageType === 'text' && text.trim()) ||
    (messageType === 'card' && (card?.title || card?.description || card?.media?.url)) ||
    (messageType === 'carousel' && cards.some((c) => c.title || c.description || c.media?.url));

  return (
    <div className="mx-auto w-[268px] rounded-[2.25rem] border-[6px] border-slate-900 bg-slate-900 shadow-xl">
      <div className="relative rounded-[1.75rem] bg-slate-50 overflow-hidden">
        {/* notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-24 bg-slate-900 rounded-b-2xl z-10" />
        {/* contact bar */}
        <div className="pt-6 pb-3 px-4 bg-white border-b border-slate-100 flex flex-col items-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
            <MessageSquareMore size={15} className="text-teal-600" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[180px]">{senderName}</span>
          <span className="text-[9px] uppercase tracking-wide text-teal-500 font-bold">RCS</span>
        </div>

        {/* conversation */}
        <div className="px-3 py-4 min-h-[320px] space-y-2 bg-[radial-gradient(circle_at_top,#ffffff,#f1f5f9)]">
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-300">
              <MessageSquareMore size={26} />
              <span className="text-[11px]">Votre message apparaîtra ici…</span>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2">
              {/* Text bubble — a carousel message is the cards themselves, so no
                  stray text bubble there; shown for text & card messages. */}
              {messageType !== 'carousel' && text.trim() && (
                <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-teal-600 px-3.5 py-2 text-[13px] leading-relaxed text-white whitespace-pre-wrap break-words shadow-sm">
                  {text}
                </div>
              )}

              {/* Single card */}
              {messageType === 'card' && card && (
                <CardView card={card} orientation={cardOrientation} width="medium" />
              )}

              {/* Carousel */}
              {messageType === 'carousel' && (
                <div className="-mx-3 px-3 w-[244px] overflow-x-auto">
                  <div className="flex gap-2 pb-1">
                    {cards.map((c, i) => (
                      <div key={i} className="shrink-0">
                        <CardView card={c} orientation="vertical" width={cardWidth} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message-level suggestion chips */}
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {suggestions.map((s, i) => (
                    <SuggestionChip key={i} s={s} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
