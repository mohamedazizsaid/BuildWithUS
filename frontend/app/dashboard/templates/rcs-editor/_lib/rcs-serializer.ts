import {
  RcsMessage,
  RcsCard,
  RcsSuggestion,
  RcsSuggestionType,
  RcsMessageType,
  RcsMediaHeight,
  DEFAULT_RCS_MESSAGE,
  emptyCard,
} from './rcs-types';

/** Serialize an RcsMessage to the JSON string stored in `content`. */
export function serializeRcs(message: RcsMessage): string {
  return JSON.stringify(message);
}

const SUGGESTION_TYPES = new Set<RcsSuggestionType>(['reply', 'openUrl', 'dial']);
const MESSAGE_TYPES = new Set<RcsMessageType>(['text', 'card', 'carousel']);
const MEDIA_HEIGHTS = new Set<RcsMediaHeight>(['short', 'medium', 'tall']);

function coerceSuggestions(raw: unknown): RcsSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): RcsSuggestion | null => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;
      const type = SUGGESTION_TYPES.has(r.type as RcsSuggestionType) ? (r.type as RcsSuggestionType) : 'reply';
      return {
        type,
        text: typeof r.text === 'string' ? r.text : '',
        url: typeof r.url === 'string' ? r.url : undefined,
        phone: typeof r.phone === 'string' ? r.phone : undefined,
      };
    })
    .filter((s): s is RcsSuggestion => s !== null);
}

function coerceCard(raw: unknown): RcsCard {
  if (!raw || typeof raw !== 'object') return emptyCard();
  const r = raw as Record<string, unknown>;
  const rawMedia = (r.media && typeof r.media === 'object' ? r.media : {}) as Record<string, unknown>;
  const height = MEDIA_HEIGHTS.has(rawMedia.height as RcsMediaHeight)
    ? (rawMedia.height as RcsMediaHeight)
    : 'medium';
  return {
    media: { url: typeof rawMedia.url === 'string' ? rawMedia.url : '', height },
    title: typeof r.title === 'string' ? r.title : '',
    description: typeof r.description === 'string' ? r.description : '',
    suggestions: coerceSuggestions(r.suggestions),
  };
}

/**
 * Parse stored `content` back into an RcsMessage. Tolerant of empty/malformed
 * content (new template, or hand-edited) — always returns a usable message.
 */
export function parseRcs(content: string | null | undefined): RcsMessage {
  const fallback = () => structuredClone(DEFAULT_RCS_MESSAGE);
  if (!content?.trim()) return fallback();
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return fallback();
  }
  if (!raw || typeof raw !== 'object') return fallback();
  const r = raw as Record<string, unknown>;

  const messageType = MESSAGE_TYPES.has(r.messageType as RcsMessageType)
    ? (r.messageType as RcsMessageType)
    : 'text';
  const cards = Array.isArray(r.cards) && r.cards.length > 0
    ? r.cards.map(coerceCard)
    : [emptyCard(), emptyCard()];

  return {
    kind: 'rcs',
    messageType,
    text: typeof r.text === 'string' ? r.text : '',
    suggestions: coerceSuggestions(r.suggestions),
    card: coerceCard(r.card),
    cards,
    cardOrientation: r.cardOrientation === 'horizontal' ? 'horizontal' : 'vertical',
    cardWidth: r.cardWidth === 'small' ? 'small' : 'medium',
  };
}
