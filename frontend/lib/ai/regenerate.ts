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
export function buildRegenerateDirective(t: TemplateData, userPrompt: string, posterUrl?: string): string {
  const seed = regenerateSeed(t);
  const banner = extractBannerUrl(t, posterUrl);
  const meta = metaFromHead(t.globalStyles.customHead);
  const L: string[] = [];

  L.push(
    "Régénère une version AMÉLIORÉE et plus soignée (niveau premium) de l'email ci-dessous. " +
      'Tu peux RESTRUCTURER librement la mise en page, le rythme et la hiérarchie pour la rendre plus belle, ' +
      'MAIS garde la même marque (couleurs), le même contenu (titres, textes, prix, avantages, boutons) et la même image. ' +
      "Ne duplique RIEN : un seul en-tête, un seul pied de page (tout en bas).",
  );
  L.push('');
  L.push(
    `CHARTE (setTheme) : accentColor "${seed.accentColor || '#1d4ed8'}", mood "${seed.mood}"` +
      (seed.backgroundColor ? `, backgroundColor "${seed.backgroundColor}"` : '') +
      '. Réutilise ces couleurs de marque.',
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
