import { v4 as uuid } from 'uuid';
import type { Row, TemplateData } from '@/lib/editor-types';

/**
 * Deterministic image-placement helpers shared by the chat and image routes.
 *
 * Small models (gemma4-26b) are unreliable at "insert THIS exact image URL" —
 * they drift to stock-photo queries or ignore a pasted URL entirely. So image
 * placement that the user explicitly asked for (an uploaded poster, a pasted
 * URL) is done here in code, not left to the model. The model still handles
 * the surrounding copy/layout; the pixels the user named are guaranteed.
 */

/** First http(s) image URL in a free-text message (png/jpg/gif/webp/svg). */
const IMAGE_URL_RE = /(https?:\/\/[^\s)<>"']+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s)<>"']*)?)/i;

export function extractImageUrl(text: string): string | null {
  const m = IMAGE_URL_RE.exec(text || '');
  return m ? m[1] : null;
}

const IMAGE_WORD = /\b(image|images|photo|photos|affiche|banni[èe]re|visuel|illustration|logo)\b/i;
const ADD_WORD = /\b(ajoute|ajouter|mets|mettre|met|ins[èe]re|ins[ée]rer|utilise|utiliser|remplace|remplacer|change|changer|affiche[rz]?)\b/i;
// Other edit targets that mean the request is NOT just about the image.
const OTHER_EDIT = /\b(titre|texte|couleur|prix|forfait|section|bouton|cta|pied|footer|police|taille|fond|sombre|clair|espac|padding|marge)\b/i;
// "image" used as a SOURCE reference ("l'offre qui est en image", "comme sur
// l'image") — NOT a request to insert an image.
const REFERENTIAL_IMAGE =
  /\b(?:en|dans|sur|de|depuis|d['’]apr[èe]s)\s+(?:l['’]\s?)?image\b|\bl['’]image\s+(?:montre|contient|affiche|pr[ée]sente)|comme\s+sur\s+l['’]?image\b/i;
// Content/offer words — the user wants offers/boxes/pricing built, not an image.
const CONTENT_WORD = /\b(offres?|box|bo[iî]tes?|cartes?|tarif\w*|forfaits?|prix|plans?|montants?)\b|[€$£]|\/\s?mois|%/i;

/** Does the message ask to INSERT an image (so a carried poster URL applies)?
 * A real URL always counts; otherwise it must mention an image AND an add verb,
 * and must NOT be referring to the image as a content source or asking for
 * offers/boxes/pricing. */
export function isImageIntent(text: string): boolean {
  const t = text || '';
  if (extractImageUrl(t)) return true;
  if (REFERENTIAL_IMAGE.test(t) || CONTENT_WORD.test(t)) return false;
  return IMAGE_WORD.test(t) && ADD_WORD.test(t);
}

/**
 * Is the message PRIMARILY about placing an image (so we can satisfy it purely
 * deterministically, skipping the model)? True when it mentions an image and
 * carries no other clear edit target / content request.
 */
export function isImageOnlyRequest(text: string): boolean {
  const t = (text || '').trim();
  if (extractImageUrl(t) && t.replace(IMAGE_URL_RE, '').trim().length < 40) return true; // basically just a URL
  return isImageIntent(t) && !OTHER_EDIT.test(t) && !CONTENT_WORD.test(t);
}

/** Does the message refer to the campaign's offer/image (so carrying the
 * analysed offer data into the edit context helps the model)? */
export function referencesCampaign(text: string): boolean {
  const t = text || '';
  return CONTENT_WORD.test(t) || REFERENTIAL_IMAGE.test(t) || IMAGE_WORD.test(t);
}

/** Does the template already reference this URL (image src/href or section bg)? */
export function templateUsesUrl(t: TemplateData, url: string): boolean {
  for (const r of t.rows) {
    if (r.styles?.backgroundUrl === url) return true;
    for (const c of r.columns)
      for (const b of c.blocks)
        if (b.type === 'image' && String(b.content.src || '') === url) return true;
  }
  return false;
}

function bannerRow(url: string, alt: string): Row {
  return {
    id: uuid(),
    layout: '100',
    columns: [
      {
        id: uuid(),
        width: '100%',
        blocks: [
          {
            id: uuid(),
            type: 'image',
            content: { src: url, alt: alt || 'Image' },
            styles: { width: '100%', padding: '0', textAlign: 'center' },
          },
        ],
      },
    ],
    styles: { backgroundColor: 'transparent', padding: '0' },
  };
}

/**
 * Guarantee `url` appears as a full-width banner at the TOP of the email, unless
 * it's already used somewhere. Returns true if the template changed. Mutates `t`.
 */
export function ensureBannerImage(t: TemplateData, url: string, alt = 'Image'): boolean {
  if (!/^https?:|^data:image\//i.test(url)) return false;
  if (templateUsesUrl(t, url)) return false;
  t.rows.unshift(bannerRow(url, alt));
  return true;
}

/**
 * Image-route finishing step: when the user uploaded a poster, the poster IS the
 * banner visual — so suppress AI stock imagery (stock hero backgrounds and
 * unresolved stock image blocks) and pin the poster at the top. This is why the
 * output stops being "random Pexels photos" and becomes the actual campaign.
 * Mutates and returns `t`.
 */
export function ensurePosterBanner(t: TemplateData, url: string, alt = 'Image'): TemplateData {
  // 1. Kill stock-photo heroes — the poster replaces them.
  for (const r of t.rows) {
    delete r.styles.backgroundUrl;
    delete r.styles.backgroundUrlQuery;
  }
  // 2. Drop image blocks we won't resolve (empty / non-http placeholders), so no
  //    random stock photo gets fetched for them later.
  for (const r of t.rows)
    for (const c of r.columns)
      c.blocks = c.blocks.filter(
        (b) => b.type !== 'image' || /^https?:/i.test(String(b.content.src || '')),
      );
  // 3. Remove rows left with no content.
  t.rows = t.rows.filter((r) => r.columns.some((c) => c.blocks.length > 0));
  // 4. Pin the poster at the top.
  ensureBannerImage(t, url, alt);
  return t;
}

/** Total block count across a template (for the edit-mode runaway guard). */
export function countBlocks(t: TemplateData): number {
  return t.rows.reduce((n, r) => n + r.columns.reduce((m, c) => m + c.blocks.length, 0), 0);
}
