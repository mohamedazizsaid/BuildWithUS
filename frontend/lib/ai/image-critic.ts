import { z } from 'zod';
import type { TemplateData } from '@/lib/editor-types';
import { visionJSON } from './image-report';

/**
 * STEP 3 of the "image → email template" pipeline: the self-check.
 *
 * After the email is generated (text-only, from the report), we look at the
 * ORIGINAL poster again and ask the model: does this email faithfully carry the
 * campaign, or did it drift? The poster is the ground truth. This catches the
 * residual failure modes of a small generator model — invented benefits, a
 * mistyped price, a missing gift/CTA, an off-brand color.
 *
 * Reliability principle (same as the rest of the pipeline): the part that needs
 * the IMAGE returns STRUCTURED FINDINGS only (no tool-calls under an image,
 * which a 26B model is flaky at). Applying the fixes is then a separate,
 * text-only edit pass (see the route), where the model is reliable.
 */

export const CriticFindingsSchema = z.object({
  fidelityOk: z
    .boolean()
    .describe(
      "true si l'email reflète fidèlement l'affiche (offre, prix, marque) sans contenu inventé ; false sinon.",
    ),
  issues: z
    .array(
      z.object({
        type: z
          .enum(['invented-content', 'missing-offer', 'wrong-price-or-text', 'off-brand', 'other'])
          .describe('Nature de l’écart.'),
        blockId: z
          .string()
          .nullable()
          .describe("L'id du bloc de l'email concerné si identifiable, sinon null."),
        problem: z.string().describe("L'écart constaté par rapport à l'affiche, en une phrase."),
        correction: z
          .string()
          .describe('La correction concrète à appliquer (ex « supprimer ce bloc », « remplacer par 19,90 €/mois »).'),
      }),
    )
    .max(8)
    .describe("Les écarts FACTUELS entre l'email et l'affiche. Tableau vide si l'email est fidèle."),
});

export type CriticFindings = z.infer<typeof CriticFindingsSchema>;

const CRITIC_SYSTEM = `Tu compares un EMAIL généré à l'AFFICHE source. L'AFFICHE est la vérité. Ta tâche : repérer uniquement les ÉCARTS FACTUELS — PAS des améliorations esthétiques.
Signale :
1. invented-content : un contenu présent dans l'email mais ABSENT de l'affiche (avantage, argument, chiffre, mention inventés).
2. wrong-price-or-text : un prix, montant, code ou texte clé qui DIFFÈRE de l'affiche.
3. missing-offer : un élément clé de l'affiche ABSENT de l'email (prix, cadeau « offert », forfait, bouton/CTA).
4. off-brand : une couleur ou un ton clairement HORS de l'identité de l'affiche.
Pour chaque écart, indique le blockId concerné (si identifiable) et une correction concrète et actionnable. Si l'email est fidèle, mets fidelityOk=true et issues=[]. N'INVENTE PAS d'écarts ; en cas de doute, ne signale rien.`;

/** Compact email view for the critic: every block with its id + visible text. */
export function summarizeTemplateForCritic(t: TemplateData) {
  const strip = (s: unknown) =>
    typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140) : undefined;
  return {
    sections: t.rows.map((r, i) => ({
      n: i + 1,
      blocks: r.columns.flatMap((c) =>
        c.blocks.map((b) => ({
          id: b.id,
          type: b.type,
          text: strip(b.content.text) || strip(b.content.href) || undefined,
          items: Array.isArray(b.content.items) ? b.content.items : undefined,
        })),
      ),
    })),
  };
}

/**
 * Look at the poster again and report how the generated email drifted from it.
 * Schema-constrained, so the findings always parse.
 */
export async function critiqueAgainstImage(
  imageDataUrl: string,
  template: TemplateData,
): Promise<CriticFindings> {
  const summary = JSON.stringify(summarizeTemplateForCritic(template));
  const task =
    `Voici l'EMAIL généré (chaque bloc a un id) :\n${summary}\n\n` +
    "Compare-le à l'affiche fournie en image et liste les écarts factuels.";
  return visionJSON(CriticFindingsSchema, 'critic_findings', CRITIC_SYSTEM, task, imageDataUrl);
}

/** Turn the findings into a targeted edit directive for the text-only fix pass. */
export function buildFixDirective(findings: CriticFindings): string {
  const L: string[] = [];
  L.push(
    "Corrige cet email pour qu'il soit FIDÈLE à l'affiche d'origine. Applique UNIQUEMENT les corrections ci-dessous — ne refais pas la mise en page, n'ajoute rien d'autre :",
  );
  for (const it of findings.issues) {
    const target = it.blockId ? ` (bloc id="${it.blockId}")` : '';
    L.push(`- ${it.problem}${target} → ${it.correction}`);
  }
  return L.join('\n');
}
