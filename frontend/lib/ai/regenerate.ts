import type { TemplateData } from '@/lib/editor-types';
import { parseHex, luminance } from './theme';

/**
 * "Regenerate" support: turn the CURRENT email into a fresh-generation brief so
 * a whole-email rewrite ("améliore", "réécris tout") rebuilds from scratch —
 * reusing the brand, the copy and the banner image — and REPLACES the canvas
 * instead of appending onto it. This is the path that fixes the append-only
 * duplication: a clean rebuild can't double the content.
 */

export interface RegenerateSeed {
  accentColor?: string;
  backgroundColor?: string;
  mood: 'light' | 'dark';
  fontFamily?: string;
}

/** Recover the brand theme from the email's global styles. */
export function regenerateSeed(t: TemplateData): RegenerateSeed {
  const g = t.globalStyles;
  const bg = g.bodyColor && parseHex(g.bodyColor) ? g.bodyColor : undefined;
  const seed: RegenerateSeed = { mood: bg && luminance(bg) < 0.5 ? 'dark' : 'light' };
  if (g.btnBackgroundColor && parseHex(g.btnBackgroundColor)) seed.accentColor = g.btnBackgroundColor;
  else if (g.linkColor && parseHex(g.linkColor)) seed.accentColor = g.linkColor;
  if (bg) seed.backgroundColor = bg;
  if (g.fontFamily) seed.fontFamily = g.fontFamily;
  return seed;
}

/** The banner image to preserve through a rewrite: an explicit poster URL, else
 * the first real (http) image already in the email. */
export function extractBannerUrl(t: TemplateData, posterUrl?: string): string {
  if (posterUrl && /^https?:|^data:image\//i.test(posterUrl)) return posterUrl;
  for (const r of t.rows)
    for (const c of r.columns)
      for (const b of c.blocks)
        if (b.type === 'image' && /^https?:/i.test(String(b.content.src || ''))) return String(b.content.src);
  return '';
}

// Common color words → a tasteful accent hex, so a "fais une version en rouge"
// variant actually RE-ACCENTS the rebuild instead of being pinned to the old
// brand color by the seed. Mirrors the accent-by-subject palette in the prompt.
const ACCENT_COLORS: { re: RegExp; hex: string }[] = [
  { re: /\brouges?\b|\bred\b/i, hex: '#e03131' },
  { re: /\bbleus?\b|\bblue\b/i, hex: '#1d4ed8' },
  { re: /\bverte?s?\b|\bgreen\b/i, hex: '#2e7d32' },
  { re: /\boranges?\b/i, hex: '#e8590c' },
  { re: /\bviolet\w*\b|\bmauve\b|\bpurple\b/i, hex: '#7048e8' },
  { re: /\broses?\b|\bpink\b/i, hex: '#d6336c' },
  { re: /\bjaunes?\b|\byellow\b/i, hex: '#f59f00' },
  { re: /\bturquoise\b|\bsarcelle\b|\bteal\b/i, hex: '#0d9488' },
  { re: /\bgris\b|\bgr[ae]y\b/i, hex: '#495057' },
  { re: /\b(dor[ée]e?s?|gold(en)?)\b/i, hex: '#b8860b' },
  { re: /\bnoir\w*\b|\bblack\b/i, hex: '#111827' },
];
// The user must be REQUESTING a color ("accents rouges", "en rouge", "couleur…")
// — a bare color word elsewhere shouldn't hijack the brand.
const ACCENT_REQUEST = /\b(accents?|couleurs?|teinte|teintes|en)\b/i;

/**
 * If the rewrite prompt explicitly asks for a new accent color, return its hex —
 * so a "deuxième version en rouge au lieu de bleu" variant re-accents instead of
 * reusing the old brand. An explicit #hex wins; otherwise the FIRST named color
 * (by position) wins, so "rouge au lieu de bleu" picks red.
 */
export function requestedAccent(userPrompt: string): string | null {
  const t = userPrompt || '';
  const explicit = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(t);
  if (explicit) return explicit[0];
  if (!ACCENT_REQUEST.test(t)) return null;
  let best: { hex: string; idx: number } | null = null;
  for (const { re, hex } of ACCENT_COLORS) {
    const m = re.exec(t);
    if (m && (best === null || m.index < best.idx)) best = { hex, idx: m.index };
  }
  return best?.hex ?? null;
}

const stripHtml = (s: unknown): string =>
  typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

/** Pull mj-title / mj-preview out of the carried <mj-head> blob, if present. */
function metaFromHead(head?: string): { title?: string; preview?: string } {
  if (!head) return {};
  const title = /<mj-title>([\s\S]*?)<\/mj-title>/i.exec(head)?.[1]?.trim();
  const preview = /<mj-preview>([\s\S]*?)<\/mj-preview>/i.exec(head)?.[1]?.trim();
  return { title: title || undefined, preview: preview || undefined };
}

/**
 * Build the regeneration directive (the user message) from the existing email:
 * brand seed + all verbatim copy + the banner, plus the user's improvement ask.
 * The model rebuilds a BETTER-structured version while keeping these facts.
 */
export function buildRegenerateDirective(
  t: TemplateData,
  userPrompt: string,
  posterUrl?: string,
  overrideAccent?: string,
): string {
  const seed = regenerateSeed(t);
  const accent = overrideAccent || seed.accentColor || '#1d4ed8';
  const banner = extractBannerUrl(t, posterUrl);
  const meta = metaFromHead(t.globalStyles.customHead);
  const L: string[] = [];

  L.push(
    overrideAccent
      ? "Régénère une NOUVELLE version de l'email ci-dessous en appliquant la NOUVELLE couleur d'accent demandée PARTOUT (boutons, intitulés, barres d'accent, mises en valeur). " +
          'Garde la même mise en page, le même contenu (titres, textes, prix, avantages, boutons) et la même image. ' +
          "Ne duplique RIEN : un seul en-tête, un seul pied de page (tout en bas)."
      : "Régénère une version AMÉLIORÉE et plus soignée (niveau premium) de l'email ci-dessous. " +
          'Tu peux RESTRUCTURER librement la mise en page, le rythme et la hiérarchie pour la rendre plus belle, ' +
          'MAIS garde la même marque (couleurs), le même contenu (titres, textes, prix, avantages, boutons) et la même image. ' +
          "Ne duplique RIEN : un seul en-tête, un seul pied de page (tout en bas).",
  );
  L.push('');
  L.push(
    `CHARTE (setTheme) : accentColor "${accent}", mood "${seed.mood}"` +
      (seed.backgroundColor ? `, backgroundColor "${seed.backgroundColor}"` : '') +
      (overrideAccent ? '. Utilise CETTE couleur d\'accent (nouvelle) partout.' : '. Réutilise ces couleurs de marque.'),
  );
  if (meta.title) L.push(`TITRE (objet) : ${meta.title}`);
  if (meta.preview) L.push(`APERÇU : ${meta.preview}`);
  if (banner) {
    L.push(
      `IMAGE / BANNIÈRE (à réutiliser telle quelle, src EXACT, en haut via addImage src="${banner}" width="100%") : ` +
        "n'utilise PAS de photo de stock pour la bannière.",
    );
  }
  L.push('');
  L.push('CONTENU ACTUEL (à conserver, reformulation légère autorisée mais garde les faits/chiffres) :');
  for (const r of t.rows) {
    for (const c of r.columns) {
      for (const b of c.blocks) {
        if (b.type === 'heading') {
          const txt = stripHtml(b.content.text);
          if (txt) L.push(`- Titre : ${txt}`);
        } else if (b.type === 'text') {
          const txt = stripHtml(b.content.text);
          // Skip spacer/colorbar helper blocks (empty or pure markup tables).
          if (txt && txt !== '&nbsp;') L.push(`- Texte : ${txt}`);
        } else if (b.type === 'button') {
          const label = stripHtml(b.content.text);
          if (label) L.push(`- Bouton : ${label}${b.content.href ? ` (${b.content.href})` : ''}`);
        } else if (b.type === 'icon-list') {
          const items = Array.isArray(b.content.items)
            ? (b.content.items as unknown as string[][]).map((it) => stripHtml(it?.[1])).filter(Boolean)
            : [];
          if (items.length) L.push(`- Liste d'avantages : ${items.join(' · ')}`);
        }
      }
    }
  }
  L.push('');
  L.push(
    `DEMANDE DE L'UTILISATEUR : ${userPrompt?.trim() || "Rends l'email plus beau et plus premium, sans rien perdre du contenu."}`,
  );
  return L.join('\n');
}
