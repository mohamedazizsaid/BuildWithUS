'use client';

import React from 'react';
import {
  MessageSquareMore,
  ExternalLink,
  Phone,
  CornerUpLeft,
  ImageIcon,
  Signal,
  Wifi,
  BatteryFull,
  Video,
  MoreVertical,
} from 'lucide-react';
import { RcsMessage, RcsCard, RcsSuggestion, RcsMediaHeight } from '../_lib/rcs-types';

const MEDIA_PX: Record<RcsMediaHeight, number> = { short: 96, medium: 150, tall: 220 };

const SUGGESTION_ICON = {
  openUrl: ExternalLink,
  dial: Phone,
  reply: CornerUpLeft,
} as const;

/** Resolve the clickable target for a suggestion, mirroring how a real RCS
 *  client routes each action. `reply` chips don't navigate, so they stay null. */
function suggestionHref(s: RcsSuggestion): string | null {
  if (s.type === 'openUrl') {
    const url = (s.url || '').trim();
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }
  if (s.type === 'dial') {
    const phone = (s.phone || '').trim();
    return phone ? `tel:${phone}` : null;
  }
  return null;
}

/** Renders a suggestion as a real anchor (openUrl / dial) when it has a target,
 *  otherwise as a styled, non-navigating button — same model as the email
 *  preview, where only buttons with an href become clickable links. */
function SuggestionAction({
  s,
  className,
  iconSize = 11,
}: {
  s: RcsSuggestion;
  className: string;
  iconSize?: number;
}) {
  const Icon = SUGGESTION_ICON[s.type];
  const href = suggestionHref(s);
  const label = s.text || 'Bouton';
  const inner = (
    <>
      <Icon size={iconSize} />
      <span className="truncate">{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={s.type === 'openUrl' ? '_blank' : undefined}
        rel={s.type === 'openUrl' ? 'noopener noreferrer' : undefined}
        className={`${className} cursor-pointer transition hover:brightness-95`}
      >
        {inner}
      </a>
    );
  }

  return (
    <button type="button" className={`${className} cursor-pointer transition hover:brightness-95`}>
      {inner}
    </button>
  );
}

const CHIP_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-blue-300 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 shadow-sm max-w-[140px]';

const CARD_BTN_CLASS =
  'inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-blue-700';

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
                <SuggestionAction key={i} s={s} className={CARD_BTN_CLASS} />
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
        {/* status bar */}
        <div className="relative z-0 flex items-center justify-between px-5 pt-2 pb-1 bg-white text-slate-800">
          <span className="text-[10px] font-semibold tabular-nums">9:41</span>
          {/* notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-20 bg-slate-900 rounded-b-2xl" />
          <span className="flex items-center gap-1">
            <Signal size={11} className="text-slate-700" />
            <Wifi size={11} className="text-slate-700" />
            <BatteryFull size={13} className="text-slate-700" />
          </span>
        </div>

        {/* contact bar */}
        <div className="px-3 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <MessageSquareMore size={14} className="text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-slate-800 truncate leading-tight">{senderName}</p>
            <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wide text-blue-600 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> RCS · Vérifié
            </span>
          </div>
          <Phone size={15} className="text-slate-400 shrink-0" />
          <Video size={16} className="text-slate-400 shrink-0" />
          <MoreVertical size={15} className="text-slate-400 shrink-0" />
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
                <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-blue-600 px-3.5 py-2 text-[13px] leading-relaxed text-white whitespace-pre-wrap break-words shadow-sm">
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
                    <SuggestionAction key={i} s={s} className={CHIP_CLASS} />
                  ))}
                </div>
              )}

              {/* delivery receipt — sells the "real conversation" feel */}
              <span className="self-start pl-1 text-[9px] text-slate-400">Distribué · 9:41</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
