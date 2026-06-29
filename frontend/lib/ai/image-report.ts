import { z } from 'zod';
import { parseHex } from './theme';

/**
 * STEP 1 of the "image → email template" pipeline: read a commercial / poster /
 * affiche into a structured, machine-usable report.
 *
 * The whole pipeline's reliability rests here. The principle proven against our
 * vLLM server (gemma4-26b): STRUCTURE can be guaranteed by schema-constrained
 * decoding (`response_format: json_schema`), but ACCURACY must be engineered.
 * So this module leans on four levers, in order of impact:
 *
 *   1. Constrained decoding — the model physically cannot emit a token that
 *      breaks the schema, so the returned object ALWAYS parses.
 *   2. Schema shape — enums everywhere (the model can't hallucinate a category),
 *      nullable (not forced) fields (so it reports `null` instead of inventing a
 *      promo code), and per-field `.describe()` instructions.
 *   3. Decomposition — two NARROW passes (verbatim text/OCR, then visual design)
 *      beat one broad pass on a 26B model.
 *   4. Determinism + repair — temperature 0 for a faithful read, plus a hex/zod
 *      validation guard that fixes the residual wobble.
 *
 * Output is two reports merged into one `ImageReport`, consumed by STEP 2
 * (report → generation directive).
 */

// ── Pass A schema: CONTENT (verbatim text / OCR + the offer it encodes) ───────

/** What role a transcribed line plays. Enum so the model can't free-form it. */
export const TextRole = z.enum([
  'headline',
  'subheadline',
  'body',
  'cta',
  'price',
  'gift', // a free bonus, e.g. "Combiné offert", "2 mois Mondial TV+ offerts"
  'promo-code',
  'date',
  'fine-print',
  'brand-name',
  'other',
]);

export const ContentReportSchema = z.object({
  language: z
    .string()
    .describe("Langue principale du texte de l'image, code court ('fr', 'en', 'ar'…)."),
  texts: z
    .array(
      z.object({
        content: z
          .string()
          .describe('Le texte EXACT, transcrit mot pour mot (VERBATIM). Ne corrige ni ne reformule.'),
        role: TextRole.describe('Rôle de ce texte dans la composition.'),
      }),
    )
    .max(40)
    .describe('TOUS les textes visibles, transcrits exactement, dans l’ordre de lecture (haut → bas).'),
  offer: z
    .object({
      headline: z.string().nullable().describe('Le message/accroche principal. null si absent.'),
      subheadline: z.string().nullable().describe('Accroche secondaire. null si absent.'),
      price: z
        .string()
        .nullable()
        .describe("Le PRIX principal mis en avant, EXACT et complet (ex '19,90 €/mois', 'Dès 24,90 €/mois'). null si l'image n'affiche pas de prix unique principal."),
      discount: z
        .string()
        .nullable()
        .describe("La remise/promotion EXACTE telle qu'écrite (ex '-40%', 'prix réduit'). null si absent."),
      gifts: z
        .array(z.string())
        .max(6)
        .describe("Les avantages OFFERTS/inclus, EXACTS (ex 'Combiné offert', '2 mois de Mondial TV+ offerts'). Tableau vide si aucun."),
      promoCode: z
        .string()
        .nullable()
        .describe('Le code promo EXACT (ex "SUMMER40"). null si absent. Ne JAMAIS inventer. Un avantage "offert" N\'EST PAS un code promo.'),
      validUntil: z
        .string()
        .nullable()
        .describe("La date limite / période EXACTE telle qu'écrite. null si absent."),
      ctaText: z
        .string()
        .nullable()
        .describe("Le libellé du bouton/appel à l'action (ex 'Découvrir l'offre'). null si absent."),
      urgency: z
        .enum(['high', 'medium', 'none'])
        .describe("Niveau d'urgence transmis (compte à rebours, 'dernier jour' → high)."),
      plans: z
        .array(
          z.object({
            name: z.string().describe("Nom/intitulé du forfait (ex '100 Go', 'Forfait Pro')."),
            price: z.string().nullable().describe("Prix de CE forfait, EXACT (ex '12,90 €/mois'). null si absent."),
            features: z
              .array(z.string())
              .max(6)
              .describe('Caractéristiques de ce forfait (ex "Appels illimités", "SMS/MMS illimités").'),
          }),
        )
        .max(4)
        .describe(
          "Les forfaits/offres MULTIPLES proposés côte à côte, chacun avec son prix (ex '100 Go à 12,90 €' ET '200 Go à 22,90 €'). Tableau vide si l'image ne présente qu'une seule offre.",
        ),
    })
    .describe('L’offre commerciale extraite du texte. Tous les champs textuels sont VERBATIM.'),
});

export type ContentReport = z.infer<typeof ContentReportSchema>;

// ── Pass B schema: VISUAL (brand, colors, mood, layout) ───────────────────────

export const ColorRole = z.enum(['background', 'dominant', 'accent', 'secondary', 'text']);

export const VisualReportSchema = z.object({
  colors: z
    .array(
      z.object({
        name: z.string().describe('Nom courant de la couleur (ex "bleu marine", "rouge vif").'),
        hex: z.string().describe('Code hexadécimal #RRGGBB le plus proche.'),
        percent: z
          .number()
          .describe('Part approximative de la surface occupée par cette couleur (0–100).'),
        role: ColorRole.describe(
          "Rôle visuel : 'background' (fond), 'dominant', 'accent' (couleur de marque qui ressort), 'secondary', 'text'.",
        ),
      }),
    )
    .min(1)
    .max(8)
    .describe('Les couleurs principales, de la plus présente à la moins présente.'),
  mood: z
    .enum(['luxe', 'bold', 'playful', 'minimal', 'corporate', 'dark', 'warm', 'fresh', 'elegant'])
    .describe('Ambiance/registre visuel global.'),
  brand: z.object({
    name: z.string().nullable().describe('Nom de la marque si lisible. null sinon.'),
    fontFeel: z
      .enum(['serif', 'sans-serif', 'display', 'script', 'mono', 'mixed'])
      .describe('Caractère de la typographie dominante.'),
    hasLogo: z.boolean().describe('Un logo de marque est-il présent ?'),
    logoPosition: z
      .enum(['top-left', 'top-center', 'top-right', 'center', 'bottom', 'none'])
      .describe('Emplacement du logo (none si aucun).'),
  }),
  subject: z.object({
    what: z.string().describe('Ce qui est promu (produit, service, événement…), en une phrase.'),
    keyVisuals: z
      .array(z.string())
      .max(6)
      .describe('Visuels clés DÉCRITS en mots-clés ANGLAIS (serviront à chercher des photos).'),
    visualStyle: z
      .enum(['photo', 'illustration', 'flat-graphic', '3d-render', 'typography', 'mixed'])
      .describe("Style visuel dominant de l'image."),
  }),
  layout: z
    .array(
      z.object({
        region: z
          .enum(['top', 'hero', 'middle', 'bottom'])
          .describe('Zone verticale de la composition.'),
        contains: z.array(z.string()).max(6).describe('Ce que contient cette zone, en mots-clés.'),
      }),
    )
    .max(6)
    .describe('Structure visuelle de haut en bas (indice de mise en page, non contraignant).'),
  summary: z
    .string()
    .describe('Résumé en 1–2 phrases de ce que l’image communique (marque + offre + ambiance).'),
});

export type VisualReport = z.infer<typeof VisualReportSchema>;

// ── Merged report ─────────────────────────────────────────────────────────────

export interface ImageReport {
  content: ContentReport;
  visual: VisualReport;
}

// ── Server config (server-side only — never import this from the browser) ─────

const BASE = process.env.AI_BASE_URL;
const KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || 'gemma4-26b';

// ── Per-pass instructions (accuracy lives in these prompts) ───────────────────

const CONTENT_SYSTEM = `Tu es un analyste OCR méticuleux. Ta SEULE tâche : transcrire EXACTEMENT tout le texte d'une image marketing (affiche, publicité, poster) et en extraire l'offre commerciale.
RÈGLES ABSOLUES :
- Transcris chaque texte MOT POUR MOT, sans corriger, traduire ni reformuler. Respecte la casse et la ponctuation.
- Les codes promo, prix, dates et mentions légales doivent être EXACTS, caractère par caractère.
- N'invente RIEN. Si un champ de l'offre (price, discount, promoCode, validUntil, ctaText, subheadline…) n'apparaît PAS explicitement dans l'image, mets la valeur null (ou un tableau vide pour gifts/plans). NE mets JAMAIS un placeholder ("N/A", "Inconnu", "Aucun").

EXTRACTION DE L'OFFRE — distingue bien :
- price : le PRIX principal mis en avant, complet et exact (ex "19,90 €/mois", "Dès 24,90 €/mois"). S'il y a PLUSIEURS forfaits avec chacun son prix, laisse price=null et remplis plans[].
- gifts : tout ce qui est OFFERT/inclus. Une mention "… offert" ou "… offerts" (ex "Combiné offert", "2 mois de Mondial TV+ offerts", "Mondial TV+ offert") va dans gifts — JAMAIS dans promoCode.
- promoCode : UNIQUEMENT un vrai code à saisir (lettres/chiffres, ex "ETE40"). Un avantage offert n'est PAS un code.
- plans : si l'image montre 2+ forfaits côte à côte (ex "100 Go à 12,90 €/mois" ET "200 Go à 22,90 €/mois"), crée un plan par forfait avec son name, son price et ses features. Sinon tableau vide.
- discount : une remise explicite (ex "-40%", "prix réduit"). null sinon.
- headline = le vrai message principal s'il existe, sinon null.
- Ordonne les textes de haut en bas (ordre de lecture). Le rôle 'gift' sert pour les mentions "offert".`;

const VISUAL_SYSTEM = `Tu es un directeur artistique qui analyse l'IDENTITÉ VISUELLE d'une image marketing (affiche, publicité, poster).
Décris la marque, les couleurs (avec leur part de surface approximative), l'ambiance, la typographie et la structure visuelle.
RÈGLES :
- Donne les couleurs de la plus présente à la moins présente, avec un hex #RRGGBB proche et la couleur d'ACCENT de la marque bien identifiée.
- N'invente PAS de nom de marque. Si aucun nom de marque n'est lisible, brand.name DOIT être null — JAMAIS "Inconnu", "Unknown" ou "N/A".
- Les "keyVisuals" sont des mots-clés ANGLAIS décrivant les visuels (ils serviront à chercher des photos).
- Sois factuel : décris ce que tu VOIS, pas ce que tu imagines.`;

// ── The constrained vision call ───────────────────────────────────────────────

/**
 * One schema-constrained multimodal call to the vLLM server. Uses
 * `response_format: json_schema` (verified to work on our gemma4-26b deployment)
 * so the returned content is guaranteed to match `schema`; we still zod-parse it
 * as a second line of defence and to get a typed object back.
 *
 * @throws if the server is unconfigured, the request fails, or the (rare) parse
 *   fails even after one repair attempt.
 */
export async function visionJSON<T>(
  schema: z.ZodType<T>,
  schemaName: string,
  systemPrompt: string,
  task: string,
  imageDataUrl: string,
): Promise<T> {
  if (!BASE || !KEY) {
    throw new Error('AI server not configured: set AI_BASE_URL and AI_API_KEY (server-side).');
  }

  // zod 4 → JSON Schema. Inline reused defs so the grammar compiler never sees a
  // $ref/$defs it might choke on; strip the $schema meta key vLLM doesn't need.
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7', reused: 'inline' }) as Record<
    string,
    unknown
  >;
  delete jsonSchema.$schema;

  const call = async (messages: unknown[]): Promise<string> => {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0, // faithful reading, not creativity
        max_tokens: 1600,
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: { name: schemaName, strict: true, schema: jsonSchema },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Vision read failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  };

  const userContent = [
    { type: 'text', text: task },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ];
  const baseMessages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  let raw = await call(baseMessages);
  let parsed = safeParse(schema, raw);

  // Repair pass: constrained decoding makes this rare, but if the content fails
  // zod (e.g. an out-of-range number), feed the error back once.
  if (!parsed.ok) {
    const repairMessages = [
      ...baseMessages,
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content: `Ta réponse JSON est invalide : ${parsed.error}. Renvoie UNIQUEMENT le JSON corrigé conforme au schéma.`,
      },
    ];
    raw = await call(repairMessages);
    parsed = safeParse(schema, raw);
    if (!parsed.ok) throw new Error(`Vision read could not be parsed: ${parsed.error}`);
  }

  return parsed.value;
}

function safeParse<T>(
  schema: z.ZodType<T>,
  raw: string,
): { ok: true; value: T } | { ok: false; error: string } {
  // gemma occasionally wraps the JSON in control tokens (<|...|>), a code fence,
  // or a stray line of prose. Strip those, then isolate the JSON object itself
  // (first '{' … matching last '}') so leading/trailing noise can't break parse.
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
    return { ok: false, error: 'not valid JSON' };
  }
  const result = schema.safeParse(obj);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
}

// ── Validation / repair of report content (Layer 6) ───────────────────────────

/** Common color names → hex, to recover a usable hex when the model's hex is
 * malformed but its color NAME is clear (the residual #FA7B7B-type wobble). */
const NAMED_COLORS: Record<string, string> = {
  black: '#000000', noir: '#000000',
  white: '#ffffff', blanc: '#ffffff',
  red: '#e03131', rouge: '#e03131',
  blue: '#1d4ed8', bleu: '#1d4ed8',
  'navy': '#1e3a8a', 'bleu marine': '#1e3a8a',
  green: '#2e7d32', vert: '#2e7d32',
  orange: '#e8590c',
  yellow: '#f59f00', jaune: '#f59f00',
  purple: '#7048e8', violet: '#7048e8',
  pink: '#d6336c', rose: '#d6336c',
  gold: '#b8860b', 'doré': '#b8860b', dore: '#b8860b',
  gray: '#868e96', grey: '#868e96', gris: '#868e96',
  brown: '#8a5a2b', marron: '#8a5a2b',
  teal: '#0d9488',
  beige: '#e7d8c0', cream: '#f5efe0',
};

function repairHex(hex: string, name: string): string | null {
  if (parseHex(hex)) return hex.startsWith('#') ? hex : `#${hex}`;
  const key = name.trim().toLowerCase();
  if (NAMED_COLORS[key]) return NAMED_COLORS[key];
  for (const [n, h] of Object.entries(NAMED_COLORS)) if (key.includes(n)) return h;
  return null; // unrecoverable — caller drops it
}

/** Normalise a fresh visual report: drop colors with no recoverable hex, fix the
 * rest, and ensure at least one color survives. */
function normalizeVisual(v: VisualReport): VisualReport {
  const colors = v.colors
    .map((c) => {
      const hex = repairHex(c.hex, c.name);
      return hex ? { ...c, hex } : null;
    })
    .filter((c): c is VisualReport['colors'][number] => c !== null);
  return { ...v, colors };
}

// ── Public entry point ─────────────────────────────────────────────────────────

/**
 * Read a marketing image into a full structured report. Runs the two narrow
 * passes (content/OCR, then visual) and merges them. `imageDataUrl` is a
 * `data:image/...;base64,...` URL (resized client-side before upload).
 */
export async function readImageReport(imageDataUrl: string): Promise<ImageReport> {
  const [content, visual] = await Promise.all([
    visionJSON(
      ContentReportSchema,
      'content_report',
      CONTENT_SYSTEM,
      "Transcris EXACTEMENT tout le texte de cette image et extrais l'offre commerciale.",
      imageDataUrl,
    ),
    visionJSON(
      VisualReportSchema,
      'visual_report',
      VISUAL_SYSTEM,
      "Analyse l'identité visuelle de cette image (marque, couleurs, ambiance, structure).",
      imageDataUrl,
    ),
  ]);
  return { content, visual: normalizeVisual(visual) };
}
