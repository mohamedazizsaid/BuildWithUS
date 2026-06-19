// RCS (RBM) message model — our internal representation, RBM-aligned.
// This is the analog of MJML for email or plain text for SMS: it is what gets
// JSON-serialized into the template `content`. A future "send" step would map
// it to the exact Google RBM agent-message JSON.

export type RcsSuggestionType = 'reply' | 'openUrl' | 'dial';

export interface RcsSuggestion {
  type: RcsSuggestionType;
  text: string;
  url?: string;   // openUrl
  phone?: string; // dial
}

export type RcsMediaHeight = 'short' | 'medium' | 'tall';

export interface RcsCard {
  media?: { url: string; height: RcsMediaHeight };
  title?: string;
  description?: string;
  suggestions: RcsSuggestion[]; // card buttons
}

export type RcsMessageType = 'text' | 'card' | 'carousel';

export interface RcsMessage {
  kind: 'rcs';
  messageType: RcsMessageType;
  /** Standalone text message + chat fallback. */
  text: string;
  /** Message-level chips (text & single-card messages). */
  suggestions: RcsSuggestion[];
  /** Present when messageType === 'card'. */
  card?: RcsCard;
  /** Present when messageType === 'carousel'. */
  cards: RcsCard[];
  cardOrientation: 'vertical' | 'horizontal';
  cardWidth: 'small' | 'medium';
}

export function emptyCard(): RcsCard {
  return { media: { url: '', height: 'medium' }, title: '', description: '', suggestions: [] };
}

export function defaultSuggestion(type: RcsSuggestionType): RcsSuggestion {
  if (type === 'openUrl') return { type, text: 'Voir', url: '' };
  if (type === 'dial') return { type, text: 'Appeler', phone: '' };
  return { type: 'reply', text: 'Oui' };
}

export const DEFAULT_RCS_MESSAGE: RcsMessage = {
  kind: 'rcs',
  messageType: 'text',
  text: '',
  suggestions: [],
  card: emptyCard(),
  cards: [emptyCard(), emptyCard()],
  cardOrientation: 'vertical',
  cardWidth: 'medium',
};
