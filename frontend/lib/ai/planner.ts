import { z } from 'zod';
import { DesignSpecSchema, type DesignSpec, type SpecSection } from './design-spec';
import { TemplateBuilder } from './block-factory';
import { parseHex } from './theme';

/**
 * The PLANNER + EXECUTOR — Phase 2's orchestrator.
 *
 *   planDesign()  → one schema-constrained LLM call returning a DesignSpec
 *                   (which look, which sections, the copy). Small models are
 *                   reliable at this; they are NOT reliable at 30 sequential
 *                   tool calls.
 *   executeSpec() → builds the email from the spec deterministically, so the
 *                   output is always complete, never duplicated, never leaks
 *                   control tokens, and always ends in a footer.
 *
 * Design quality now comes from two places: the planner's structural/look/copy
 * choices, and the builder's design-system vocabulary (design-systems.ts).
 */

const BASE = process.env.AI_BASE_URL;
const KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || 'gemma4-26b';

const PLANNER_SYSTEM = `Tu es un DIRECTEUR ARTISTIQUE et CONCEPTEUR-RÉDACTEUR expert en emails marketing haut de gamme (niveau Apple / Nike / Stripe). On te donne un brief ; tu renvoies UNIQUEMENT un objet JSON conforme au schéma : le PLAN COMPLET d'un email premium (le look, les sections, et tout le texte rédigé).

PRINCIPES DE CONCEPTION :
- Choisis le designSystem qui SERT le sujet : 'bold' (promo/vente/lancement, percutant), 'editorial' (newsletter/contenu soigné), 'minimal' (tech/épuré/premium discret), 'luxe' (mode/beauté/événement haut de gamme), 'corporate' (finance/B2B/SaaS sérieux). Ne choisis pas toujours le même.
- Conçois une SÉQUENCE de sections variée et rythmée, du HAUT vers le BAS. Commence par un en-tête fort (hero), alterne les types de sections (intro, features, pricing, offer, columns, cta, quote, colorbar, divider), termine TOUJOURS par un footer. UN SEUL hero, UN SEUL footer. Ne répète pas deux fois la même section.
- 5 à 9 sections en général. Donne du rythme : ne mets pas trois paragraphes de texte d'affilée.
- Rédige un VRAI texte, concis et orienté bénéfice, dans la langue du brief (français par défaut). Titres courts sans point final. Eyebrows en 1-3 mots. Boutons = un verbe d'action ("Découvrir", "J'en profite"), jamais "Cliquez ici". Pas de "Lorem ipsum".
- imageQuery : mots-clés ANGLAIS concrets pour une photo (uniquement pour un hero en fond ou des colonnes illustrées).

FIDÉLITÉ — RÈGLE ABSOLUE (la plus importante) :
- Si le brief contient des PRIX, des MONTANTS, des FORFAITS, un nom de marque, des mentions "offert" ou un code promo, tu DOIS les reprendre EXACTEMENT, caractère pour caractère (mêmes chiffres, même devise). N'invente JAMAIS un prix, un nom de marque, ni un forfait qui n'est pas dans le brief, et n'en OMETS aucun.
- Dès que le brief mentionne DEUX forfaits/offres ou plus (ex "100 Go à 12,90€" ET "200 Go à 22,90€"), tu DOIS produire une section kind:'pricing' avec UN objet plans[] par forfait (name + price EXACT + features), pour les afficher côte à côte ("deux box"). N'utilise PAS de simple texte pour ça.
- Un seul prix/offre mis en avant → une section kind:'offer' avec ce prix.
COULEURS : respecte accentColor / mood / backgroundColor s'ils sont donnés dans le brief.`;

function safeParse(raw: string): DesignSpec | null {
  let s = raw
    .replace(/<\|[^|>]*\|?>/g, '')
    .replace(/```(?:json)?/gi, '')
    .trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  let obj: unknown;
  try {
    obj = JSON.parse(s);
  } catch {
    return null;
  }
  const r = DesignSpecSchema.safeParse(obj);
  return r.success ? r.data : null;
}

export interface PlanSeed {
  accentColor?: string;
  backgroundColor?: string;
  mood?: 'light' | 'dark';
}

/**
 * Plan a full email design from a brief. Returns a validated DesignSpec, or null
 * if the model/server is unavailable or the output can't be parsed (caller then
 * falls back to the legacy agentic generation). When `seed` is given (image /
 * regenerate paths) the brand colours/mood OVERRIDE whatever the model picked,
 * for exact brand fidelity.
 */
export async function planDesign(opts: { brief: string; seed?: PlanSeed }): Promise<DesignSpec | null> {
  const base = process.env.AI_BASE_URL || BASE;
  const key = process.env.AI_API_KEY || KEY;
  const model = process.env.AI_MODEL || MODEL || 'deepseek/deepseek-chat';
  if (!base || !key) return null;
  const jsonSchema = z.toJSONSchema(DesignSpecSchema, { target: 'draft-7', reused: 'inline' }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  let raw: string;
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        // Low temperature: fidelity to the brief's facts/prices matters more than
        // creative wording. Design variety comes from the design-system choice.
        temperature: 0.3,
        max_tokens: 3000,
        messages: [
          { role: 'system', content: PLANNER_SYSTEM },
          { role: 'user', content: opts.brief },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'design_spec', strict: true, schema: jsonSchema },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    raw = data?.choices?.[0]?.message?.content ?? '';
  } catch {
    return null;
  }

  const spec = safeParse(raw);
  if (!spec) return null;

  // Seed overrides — brand fidelity beats the model's colour guess.
  if (opts.seed) {
    if (opts.seed.accentColor && parseHex(opts.seed.accentColor)) spec.accentColor = opts.seed.accentColor;
    if (opts.seed.backgroundColor && parseHex(opts.seed.backgroundColor)) spec.backgroundColor = opts.seed.backgroundColor;
    if (opts.seed.mood) spec.mood = opts.seed.mood;
  }
  return spec;
}

// ── Executor ────────────────────────────────────────────────────────────────

const tone = (s: SpecSection, fallback: 'default' | 'surface' | 'dark' | 'accent') => s.tone ?? fallback;
const txt = (v: string | null | undefined): string => (v ?? '').trim();

function executeSection(b: TemplateBuilder, s: SpecSection): void {
  switch (s.kind) {
    case 'hero': {
      b.startHero({ query: txt(s.imageQuery) || undefined });
      if (txt(s.eyebrow)) b.addEyebrow({ text: txt(s.eyebrow) });
      if (txt(s.heading)) b.addHeading({ text: txt(s.heading), level: 'h1' });
      if (txt(s.subheading)) b.addText({ text: txt(s.subheading), role: 'lede' });
      if (txt(s.ctaText)) b.addButton({ text: txt(s.ctaText), url: txt(s.ctaUrl) || '#' });
      break;
    }
    case 'banner': {
      // Empty src + alt-as-query → resolveStockImages fetches a real photo later.
      if (txt(s.imageQuery)) b.addImage({ alt: txt(s.imageQuery) });
      break;
    }
    case 'intro': {
      b.startSection('100', { tone: tone(s, 'default') });
      if (txt(s.eyebrow)) b.addEyebrow({ text: txt(s.eyebrow) });
      if (txt(s.heading)) b.addHeading({ text: txt(s.heading), level: 'h2' });
      if (txt(s.body)) b.addText({ text: txt(s.body), role: 'body' });
      break;
    }
    case 'features': {
      b.startSection('100', { tone: tone(s, 'default') });
      if (txt(s.eyebrow)) b.addEyebrow({ text: txt(s.eyebrow) });
      if (txt(s.heading)) b.addHeading({ text: txt(s.heading), level: 'h2' });
      const items = s.items
        .filter((it) => txt(it.title))
        .map((it) => ({
          icon: txt(it.icon) || '✓',
          text: txt(it.desc) ? `<b>${txt(it.title)}</b> — ${txt(it.desc)}` : txt(it.title),
        }));
      if (items.length) b.addIconList({ items });
      break;
    }
    case 'pricing': {
      const plans = s.plans.filter((p) => txt(p.name));
      if (!plans.length) break;
      const layout = plans.length >= 3 ? '33-33-33' : '50-50';
      b.startSection(layout, { tone: tone(s, 'default') });
      plans.slice(0, layout === '33-33-33' ? 3 : 2).forEach((p, i) => {
        if (i > 0) b.nextColumn();
        b.cardColumn();
        b.addText({ text: txt(p.name), role: 'caption', align: 'center' });
        if (txt(p.price)) b.addHeading({ text: txt(p.price), level: 'h1', align: 'center' });
        const feats = p.features.map(txt).filter(Boolean);
        if (feats.length) b.addText({ text: feats.join('<br/>'), role: 'body', align: 'center' });
        if (txt(p.ctaText)) b.addButton({ text: txt(p.ctaText), url: '#', align: 'center' });
      });
      break;
    }
    case 'offer': {
      b.startCard();
      if (txt(s.eyebrow)) b.addEyebrow({ text: txt(s.eyebrow), align: 'center' });
      if (txt(s.heading)) b.addHeading({ text: txt(s.heading), level: 'h1', align: 'center' });
      if (txt(s.body)) b.addText({ text: txt(s.body), role: 'body', align: 'center' });
      if (txt(s.ctaText)) b.addButton({ text: txt(s.ctaText), url: txt(s.ctaUrl) || '#', align: 'center' });
      break;
    }
    case 'columns': {
      const items = s.items.filter((it) => txt(it.title));
      if (!items.length) break;
      const layout = items.length >= 3 ? '33-33-33' : '50-50';
      b.startSection(layout, { tone: tone(s, 'default') });
      items.slice(0, layout === '33-33-33' ? 3 : 2).forEach((it, i) => {
        if (i > 0) b.nextColumn();
        if (txt(s.imageQuery)) b.addImage({ alt: txt(s.imageQuery) });
        b.addHeading({ text: txt(it.title), level: 'h3' });
        if (txt(it.desc)) b.addText({ text: txt(it.desc), role: 'body' });
      });
      break;
    }
    case 'cta': {
      b.startSection('100', { tone: tone(s, 'accent') });
      if (txt(s.heading)) b.addHeading({ text: txt(s.heading), level: 'h2', align: 'center' });
      if (txt(s.body)) b.addText({ text: txt(s.body), role: 'body', align: 'center' });
      if (txt(s.ctaText)) b.addButton({ text: txt(s.ctaText), url: txt(s.ctaUrl) || '#', align: 'center' });
      break;
    }
    case 'quote': {
      b.startSection('100', { tone: tone(s, 'surface') });
      if (txt(s.body)) b.addText({ text: `« ${txt(s.body)} »`, role: 'lede', align: 'center' });
      if (txt(s.quoteAuthor)) b.addText({ text: txt(s.quoteAuthor), role: 'caption', align: 'center' });
      break;
    }
    case 'divider': {
      b.addDivider({});
      break;
    }
    case 'colorbar': {
      const colors = s.colors.filter((c) => parseHex(c));
      if (colors.length >= 2) b.addColorBar(colors);
      break;
    }
    case 'footer': {
      b.startSection('100', { tone: 'dark' });
      const socials = s.socials.filter((l) => txt(l.platform) && txt(l.url));
      if (socials.length) b.addSocial({ links: socials, align: 'center' });
      if (txt(s.legal)) b.addText({ text: txt(s.legal), role: 'caption', align: 'center' });
      b.addText({ text: '<a href="#">Se désinscrire</a>', role: 'caption', align: 'center' });
      break;
    }
  }
}

/**
 * Build the email from a spec. Sets the brand theme + design system, then lays
 * out every section deterministically. Returns the populated builder.
 */
export function executeSpec(spec: DesignSpec): TemplateBuilder {
  const builder = new TemplateBuilder();
  builder.setTheme({
    accentColor: spec.accentColor,
    backgroundColor: spec.backgroundColor ?? undefined,
    mood: spec.mood,
    title: spec.title,
    previewText: spec.preview,
  });
  builder.setDesignSystem(spec.designSystem);
  for (const s of spec.sections) executeSection(builder, s);
  return builder;
}
