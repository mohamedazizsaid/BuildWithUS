import type { ImageReport } from './image-report';
import { parseHex, luminance } from './theme';

/**
 * STEP 2 of the "image → email template" pipeline: turn the structured
 * `ImageReport` (+ an optional user prompt) into inputs for the EXISTING
 * tool/block generator. No new generator — we reuse `createBlockTools` +
 * `TemplateBuilder`, exactly like the text path. This module produces two
 * things:
 *
 *   - a deterministic THEME SEED (brand accent + mood + background), so the
 *     email matches the poster's colors regardless of what the model guesses;
 *   - a DIRECTIVE (the user message), a structured brief that feeds the model
 *     the campaign's verbatim copy, prices, gifts and plans plus a layout hint.
 *
 * The image governs brand + content; the user prompt steers structure + intent.
 */

export interface ImageThemeSeed {
  accentColor: string;
  backgroundColor?: string;
  mood: 'light' | 'dark';
  fontFamily?: string;
}

/** fontFeel → a real, email-safe font stack (only when it's worth overriding). */
const FONT_BY_FEEL: Record<string, string | undefined> = {
  serif: 'Georgia, serif',
  script: 'Georgia, serif',
  mono: "'Courier New', monospace",
  display: undefined,
  'sans-serif': undefined,
  mixed: undefined,
};

/**
 * Pick the brand theme deterministically from the report's colors:
 * - mood: dark if the background color is dark, else light (this is why a
 *   white-background poster correctly yields a light email).
 * - accent: the most prominent color tagged 'accent' (then 'secondary', then any
 *   non-background/non-text color), falling back to a sane blue.
 * - backgroundColor: the detected background, for exact brand fidelity.
 */
export function imageThemeSeed(report: ImageReport): ImageThemeSeed {
  const colors = report.visual.colors.filter((c) => parseHex(c.hex));
  const byPercent = [...colors].sort((a, b) => b.percent - a.percent);

  const bg = colors.find((c) => c.role === 'background') ?? byPercent[0];
  const mood: 'light' | 'dark' = bg && luminance(bg.hex) < 0.5 ? 'dark' : 'light';

  const accents = colors.filter((c) => c.role === 'accent').sort((a, b) => b.percent - a.percent);
  const accentColor =
    accents[0]?.hex ||
    colors.find((c) => c.role === 'secondary')?.hex ||
    byPercent.find((c) => c.role !== 'background' && c.role !== 'text')?.hex ||
    '#1d4ed8';

  const seed: ImageThemeSeed = { accentColor, mood };
  if (bg && parseHex(bg.hex)) seed.backgroundColor = bg.hex;
  const font = FONT_BY_FEEL[report.visual.brand.fontFeel];
  if (font) seed.fontFamily = font;
  return seed;
}

/** Build the generation directive (the user message) from the report.
 * `posterUrl` (when the uploaded affiche was stored to a public URL) makes the
 * poster ITSELF the banner — no stock photo — so the email looks like the
 * campaign instead of a generic stock-image layout. */
export function buildImageDirective(report: ImageReport, userPrompt?: string, posterUrl?: string): string {
  const { content, visual } = report;
  const o = content.offer;
  const seed = imageThemeSeed(report);
  const L: string[] = [];

  L.push(
    "Crée un email marketing premium à partir de cette affiche publicitaire analysée. RESPECTE EXACTEMENT la marque, l'offre et les prix : reprends les textes VERBATIM (surtout les prix, montants, mentions « offert » et codes), ne les reformule pas et n'invente aucun prix.",
  );
  L.push('');

  // Brand + theme seed (the model must call setTheme with these exact values).
  L.push(
    `MARQUE : ${visual.brand.name || '(non nommée)'}` +
      (visual.brand.hasLogo ? ` — logo présent (${visual.brand.logoPosition})` : ''),
  );
  L.push(
    `CHARTE (setTheme) : accentColor "${seed.accentColor}", mood "${seed.mood}"` +
      (seed.backgroundColor ? `, backgroundColor "${seed.backgroundColor}"` : '') +
      `. Ce sont les couleurs de la marque — respecte-les.`,
  );
  L.push(`AMBIANCE : ${visual.mood}.`);
  L.push('');

  // The offer, verbatim.
  L.push('OFFRE (verbatim, à reprendre tel quel) :');
  if (o.headline) L.push(`- Titre principal : ${o.headline}`);
  if (o.subheadline) L.push(`- Sous-titre : ${o.subheadline}`);
  if (o.price) L.push(`- Prix : ${o.price}`);
  if (o.discount) L.push(`- Remise : ${o.discount}`);
  if (o.gifts.length) L.push(`- Offert / inclus : ${o.gifts.join(' · ')}`);
  if (o.promoCode) L.push(`- Code promo : ${o.promoCode}`);
  if (o.validUntil) L.push(`- Validité : ${o.validUntil}`);
  L.push(`- Bouton (CTA) : ${o.ctaText || "Découvrir l'offre"}`);

  // Benefit bullets (short body lines that read like a feature list). Collapse
  // newlines and drop anything already covered by a gift, so they don't repeat.
  const bullets = content.texts
    .filter((t) => t.role === 'body' || t.role === 'gift')
    .map((t) => t.content.replace(/\s+/g, ' ').trim())
    .filter((s) => s && s.length <= 60 && !o.gifts.some((g) => s.includes(g) || g.includes(s)));
  if (bullets.length) {
    L.push('');
    L.push(`POINTS CLÉS (liste à puces) : ${[...new Set(bullets)].join(' · ')}`);
  }

  // Multi-tier plans → side-by-side pricing.
  if (o.plans.length) {
    L.push('');
    L.push('FORFAITS (à présenter CÔTE À CÔTE — section 2 colonnes ou cartes) :');
    for (const p of o.plans) {
      L.push(
        `- ${p.name}${p.price ? ` — ${p.price}` : ''}` +
          (p.features.length ? ` (${p.features.join(', ')})` : ''),
      );
    }
  }

  // Hero visual. With a poster URL the affiche IS the banner (src exact, no stock
  // photo). Without one, fall back to a stock-photo query for the hero.
  L.push('');
  if (posterUrl) {
    L.push(
      `IMAGE DE LA CAMPAGNE (la bannière de l'email) : utilise CETTE image telle quelle, en HAUT de l'email, ` +
        `via addImage avec src="${posterUrl}" width="100%". NE cherche AUCUNE photo de stock et n'utilise PAS startHero — ` +
        `cette affiche est déjà le visuel de marque. Place ensuite le titre, le prix et les avantages SOUS la bannière.`,
    );
  } else if (visual.subject.keyVisuals.length) {
    L.push(`VISUEL DE FOND (héro) : query ANGLAIS = "${visual.subject.keyVisuals.slice(0, 4).join(' ')}".`);
  }
  L.push(`SUJET : ${visual.subject.what}`);

  // Structure hint.
  L.push('');
  const struct =
    (posterUrl ? "bannière = l'affiche (image src exact, tout en haut) ; " : 'bannière héro (marque + titre + sous-titre + prix + bouton) ; ') +
    (bullets.length ? "section avec liste d'avantages ; " : '') +
    (o.plans.length
      ? 'section forfaits côte à côte (cartes/2 colonnes avec prix) ; '
      : o.price
        ? 'carte de prix mise en avant ; '
        : '') +
    'pied de page (mentions + lien de désinscription).';
  L.push(`STRUCTURE SUGGÉRÉE : ${struct}`);

  // User intent (steers structure; never overrides verbatim offer/brand).
  L.push('');
  L.push(
    `DEMANDE DE L'UTILISATEUR : ${
      userPrompt?.trim() ||
      "Transforme fidèlement cette affiche en email marketing complet, en gardant l'offre et l'identité de la marque."
    }`,
  );

  return L.join('\n');
}
