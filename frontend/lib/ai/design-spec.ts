import { z } from 'zod';

/**
 * The DESIGN SPEC: a structured plan for a whole email, produced by the planner
 * (one schema-constrained LLM call) and executed deterministically by the
 * builder. This is the heart of Phase 2 — instead of asking a small model to
 * fire 30 tool calls in a row (slow, leaky, duplication-prone), we ask it for
 * ONE structured object it's good at producing, then build the email in code.
 *
 * Schema shape follows the image-report pattern that's proven on the vLLM
 * server: enums everywhere, FLAT section objects with nullable fields (no
 * discriminated unions — the grammar compiler handles a flat schema far more
 * reliably than anyOf), per-field instructions.
 */

export const SectionKind = z.enum([
  'hero', // full-bleed banner: eyebrow + headline + subheading + CTA (over a photo if imageQuery)
  'banner', // a single full-width image (e.g. an uploaded poster) — set via the route, rarely by the model
  'intro', // eyebrow + heading + body paragraph
  'features', // eyebrow + heading + a bullet list of benefits (items[])
  'pricing', // 2–3 plans side by side (plans[])
  'offer', // one highlighted offer/price card (heading=price/label, body, CTA)
  'columns', // 2–3 parallel items, each an optional image + heading + body (items[])
  'cta', // a focused call-to-action band (heading + body + button)
  'quote', // a testimonial / pull quote (body = quote, quoteAuthor)
  'divider', // a thin rule
  'colorbar', // a multi-colour brand accent bar (colors[])
  'footer', // socials + legal + unsubscribe
]);

const Item = z.object({
  icon: z.string().nullable().describe('Emoji/symbole pertinent (✓ ★ 🚀 …) ou null.'),
  title: z.string().describe('Intitulé court de l’élément.'),
  desc: z.string().nullable().describe('Courte description (1 phrase) ou null.'),
});

const Plan = z.object({
  name: z.string().describe('Nom du forfait (ex "100 Go", "Pro").'),
  price: z.string().nullable().describe('Prix EXACT (ex "12,90 €/mois") ou null.'),
  features: z.array(z.string()).max(6).describe('Caractéristiques de ce forfait.'),
  ctaText: z.string().nullable().describe('Libellé du bouton de ce forfait ou null.'),
});

export const SectionSchema = z.object({
  kind: SectionKind.describe('Type de section.'),
  tone: z
    .enum(['default', 'surface', 'dark', 'accent'])
    .nullable()
    .describe("Tonalité de fond ('dark' en-tête/pied, 'accent' bande de marque, 'surface' encadré léger) ou null."),
  eyebrow: z.string().nullable().describe('Intitulé court en MAJUSCULES au-dessus du titre, ou null.'),
  heading: z.string().nullable().describe('Titre de la section, ou null.'),
  subheading: z.string().nullable().describe('Sous-titre / accroche secondaire, ou null.'),
  body: z.string().nullable().describe('Paragraphe de texte (ou la citation pour kind=quote), ou null.'),
  ctaText: z.string().nullable().describe("Libellé du bouton d'action, ou null."),
  ctaUrl: z.string().nullable().describe('URL du bouton (sinon "#").'),
  imageQuery: z
    .string()
    .nullable()
    .describe("Mots-clés ANGLAIS pour une photo (fond de héro, ou images de colonnes), ou null."),
  items: z.array(Item).max(6).describe('Éléments pour kind=features ou kind=columns (sinon []).'),
  plans: z.array(Plan).max(3).describe('Forfaits côte à côte pour kind=pricing (sinon []).'),
  colors: z.array(z.string()).max(6).describe('Couleurs hex pour kind=colorbar (sinon []).'),
  quoteAuthor: z.string().nullable().describe('Auteur de la citation pour kind=quote, ou null.'),
  socials: z
    .array(z.object({ platform: z.string(), url: z.string() }))
    .max(6)
    .describe('Réseaux sociaux pour kind=footer (sinon []).'),
  legal: z.string().nullable().describe('Mentions légales / copyright pour kind=footer, ou null.'),
});

export const DesignSpecSchema = z.object({
  designSystem: z
    .enum(['editorial', 'bold', 'minimal', 'luxe', 'corporate'])
    .describe(
      "Le système visuel adapté au sujet : 'editorial' (newsletter soignée, aligné à gauche), 'bold' (promo/vente, centré, gros titres, boutons pilule), 'minimal' (épuré, aéré, léger), 'luxe' (élégant, serif, centré), 'corporate' (B2B/finance, structuré).",
    ),
  mood: z.enum(['light', 'dark']).describe("Ambiance claire ou sombre."),
  accentColor: z.string().describe("Couleur d'accent de la marque (hex #RRGGBB)."),
  backgroundColor: z.string().nullable().describe('Couleur de fond du corps (hex) ou null.'),
  title: z.string().describe("Objet/titre technique de l'email."),
  preview: z.string().describe("Texte d'aperçu (≤ 90 caractères) affiché dans la boîte de réception."),
  sections: z
    .array(SectionSchema)
    .min(3)
    .max(12)
    .describe(
      "Les sections de l'email, dans l'ordre HAUT → BAS. Commence par un en-tête fort (hero ou intro), inclus ≥1 CTA, termine par un footer. Un SEUL hero, un SEUL footer.",
    ),
});

export type DesignSpec = z.infer<typeof DesignSpecSchema>;
export type SpecSection = z.infer<typeof SectionSchema>;
