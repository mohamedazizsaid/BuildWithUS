// Shared shapes for the interactive "Create with AI" wizard.
// Mirrors the backend brief in ai-template-service (prompt_builder.build_brief_prompt).

export type EmailType =
  | 'welcome'
  | 'promo'
  | 'newsletter'
  | 'invoice'
  | 'confirmation'
  | 'reminder'
  | 'schedule'
  | 'notification'
  | 'badge'
  | 'generic';

export type Tone = 'professional' | 'friendly' | 'playful';
export type Lang = 'fr' | 'en';

export interface AiBrand {
  company?: string;
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  background_color?: string;
}

export interface AiContent {
  headline?: string;
  message?: string;
  cta_label?: string;
  cta_url?: string;
  extras?: Record<string, string>;
}

export interface AiBrief {
  email_type: EmailType;
  language: Lang;
  tone: Tone;
  brand: AiBrand;
  content: AiContent;
  free_text?: string;
}

export interface Palette {
  name: string;
  primary: string;
  accent: string;
  background: string;
  text: string;
}

export function emptyBrief(): AiBrief {
  return {
    email_type: 'generic',
    language: 'fr',
    tone: 'professional',
    brand: {},
    content: { extras: {} },
  };
}
