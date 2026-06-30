import { streamText, stepCountIs } from 'ai';
import { getModel, DEFAULT_MODEL, FALLBACK_MODEL } from '@/lib/ai/provider';
import { createBlockTools, createEditTools } from '@/lib/ai/tools';
import { TemplateBuilder, frameTemplate, dedupeTemplate } from '@/lib/ai/block-factory';
import { buildImageSystemPrompt, buildSystemPrompt } from '@/lib/ai/system-prompt';
import { readImageReport } from '@/lib/ai/image-report';
import { buildImageDirective, imageThemeSeed } from '@/lib/ai/report-to-directive';
import { ensurePosterBanner } from '@/lib/ai/poster-image';
import { planDesign, executeSpec } from '@/lib/ai/planner';
import {
  critiqueAgainstImage,
  buildFixDirective,
  summarizeTemplateForCritic,
  type CriticFindings,
} from '@/lib/ai/image-critic';
import type { TemplateData } from '@/lib/editor-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const IMAGE_SEARCH_URL =
  process.env.IMAGE_SEARCH_URL || process.env.NEXT_PUBLIC_IMAGE_SEARCH_API || 'http://localhost:8002';

// Self-check critic (Phase 3): compares the generated email to the poster and
// fixes factual drift. On by default; set AI_IMAGE_CRITIC=0 to skip it.
const CRITIC_ENABLED = process.env.AI_IMAGE_CRITIC !== '0';

// Per-step token cap — stops a looping model from streaming forever (see chat route).
const GEN_MAX_TOKENS = Number(process.env.AI_GEN_MAX_TOKENS) || 1500;
const PROSE_CAP = 600;

/**
 * Image → email template (STEP 1+2 wired together). Reads an uploaded poster
 * into a structured report (vision), turns it into a generation directive +
 * brand theme seed, then drives the SAME tool/block generator the text path
 * uses — so the output is an editable, MJML-exportable TemplateData.
 *
 * Body: { image: dataUrl, prompt?: string }
 * Stream (newline-delimited JSON), matching the frontend parser:
 *   { type:"status", stage:"reading" }                reading the image
 *   { type:"status", stage:"analyzed", report }       understood the campaign
 *   { type:"delta",  text }                            chat-bubble prose
 *   { type:"status", stage:"template" }                assembling the template
 *   { type:"done",   message, template, report }       final result
 *   { type:"error",  error }
 */
export async function POST(req: Request): Promise<Response> {
  let body: { image?: string; prompt?: string; posterUrl?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const image = typeof body.image === 'string' ? body.image : '';
  const userPrompt = typeof body.prompt === 'string' ? body.prompt : '';
  // Public URL of the uploaded poster (stored to MinIO client-side). When present
  // the poster itself becomes the email banner instead of AI stock photos.
  const posterUrl =
    typeof body.posterUrl === 'string' && /^https?:|^data:image\//i.test(body.posterUrl)
      ? body.posterUrl
      : '';
  if (!image.startsWith('data:image/')) {
    return Response.json({ error: 'Aucune image fournie (data URL attendue).' }, { status: 400 });
  }

  const system = buildImageSystemPrompt();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      try {
        // ── STEP 1: read the image into a structured report ──────────────────
        send({ type: 'status', stage: 'reading' });
        const report = await readImageReport(image);
        send({ type: 'status', stage: 'analyzed', report });

        // ── STEP 2: report → directive + theme seed → generation ─────────────
        const directive = buildImageDirective(report, userPrompt, posterUrl || undefined);
        const seed = imageThemeSeed(report);
        // Alt text for the poster banner — the campaign's own headline / subject.
        const posterAlt =
          report.content.offer.headline || report.visual.subject.what || report.visual.brand.name || 'Affiche';

        // One generation pass with a given model. Fresh builder + tools + prose
        // buffer per attempt; the builder is pre-seeded with the brand theme so
        // the email keeps the poster's colors even if the model under-specifies.
        const attempt = async (modelId: string) => {
          const builder = new TemplateBuilder();
          builder.setTheme({
            accentColor: seed.accentColor,
            backgroundColor: seed.backgroundColor,
            mood: seed.mood,
            fontFamily: seed.fontFamily,
          });
          const tools = createBlockTools(builder);
          const cleaner = makeProseCleaner();
          const result = streamText({
            model: getModel(modelId),
            system,
            messages: [{ role: 'user', content: directive }],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tools: tools as any,
            stopWhen: stepCountIs(36),
            maxOutputTokens: GEN_MAX_TOKENS,
          });
          // Drain fully (so tool calls finish) but forward at most PROSE_CAP chars,
          // so a looping model can't stream an endless chat bubble.
          let prose = '';
          let forwarded = 0;
          const emit = (cleaned: string) => {
            if (!cleaned || forwarded >= PROSE_CAP) return;
            const piece = cleaned.slice(0, PROSE_CAP - forwarded);
            prose += piece;
            forwarded += piece.length;
            send({ type: 'delta', text: piece });
          };
          for await (const delta of result.textStream) emit(cleaner.push(delta));
          emit(cleaner.flush());
          await result.finishReason; // rejects on model error
          return { builder, prose };
        };

        let chosen: { builder: TemplateBuilder; prose: string } | null = null;
        let lastErr: unknown = null;

        // ── Phase 2: PLAN the design, then build it deterministically ────────
        // One schema-constrained call → a full DesignSpec → an email assembled
        // in code (varied look, never duplicated, always complete). This is the
        // preferred path; the agentic loop below is the fallback.
        send({ type: 'status', stage: 'planning' });
        try {
          const spec = await planDesign({
            brief: directive,
            seed: { accentColor: seed.accentColor, backgroundColor: seed.backgroundColor, mood: seed.mood },
          });
          if (spec && spec.sections.length >= 3) {
            const builder = executeSpec(spec);
            if (builder.blockCount > 0) {
              chosen = {
                builder,
                prose: `Voici votre email premium${report.visual.brand.name ? ` pour ${report.visual.brand.name}` : ''}.`,
              };
            }
          }
        } catch (e) {
          lastErr = e;
        }

        // Fallback: legacy agentic generation (up to 3 passes, alternating models).
        if (!chosen) {
          const passes = [DEFAULT_MODEL, FALLBACK_MODEL, DEFAULT_MODEL];
          for (let i = 0; i < passes.length; i++) {
            try {
              const r = await attempt(passes[i]);
              if (r.builder.blockCount > 0) {
                chosen = r;
                break;
              }
            } catch (e) {
              lastErr = e;
            }
            if (i < passes.length - 1) send({ type: 'status', stage: 'retry' });
          }
        }

        if (!chosen) {
          send({
            type: 'error',
            error:
              lastErr instanceof Error
                ? lastErr.message
                : "Aucun bloc généré à partir de l'image. Réessayez.",
          });
          return;
        }

        // ── STEP 3: self-check against the poster (best-effort) ──────────────
        // Look at the original image again, find factual drift (invented copy,
        // wrong price, missing offer), and apply ONLY those fixes in a text-only
        // edit pass. Never blocks the result if it fails or empties the email.
        let finalBuilder = chosen.builder;
        if (CRITIC_ENABLED) {
          send({ type: 'status', stage: 'reviewing' });
          try {
            const built = chosen.builder.build();
            const findings = await critiqueAgainstImage(image, built);
            if (!findings.fidelityOk && findings.issues.length > 0) {
              const orig = chosen.builder.blockCount;
              const fixed = await applyImageFixes(built, findings);
              // Accept only a surgical correction — a big swing means the model
              // rebuilt/duplicated the email; keep the clean original instead.
              const fc = fixed.blockCount;
              if (fc >= orig - 4 && fc <= orig + 4) finalBuilder = fixed;
            }
          } catch (e) {
            // Best-effort — never block the result; surface in the dev console.
            console.warn('[from-image] self-check skipped:', e instanceof Error ? e.message : e);
          }
        }

        // ── Finalize: dedupe → frame ─────────────────────────────────────────
        // With a poster URL the affiche is the banner and we suppress AI stock
        // imagery entirely; otherwise resolve stock photos as before.
        send({ type: 'status', stage: 'template' });
        let built: TemplateData;
        if (posterUrl) {
          built = ensurePosterBanner(finalBuilder.build(), posterUrl, posterAlt);
        } else {
          await resolveStockImages(finalBuilder, IMAGE_SEARCH_URL);
          built = finalBuilder.build();
        }
        const template = frameTemplate(dedupeTemplate(built));
        send({
          type: 'done',
          message: chosen.prose.trim() || "Voici l'email créé à partir de votre affiche.",
          template,
          report,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de l'analyse de l'image";
        send({ type: 'error', error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// ── Helpers (kept local to avoid touching the working /api/ai/chat route) ─────

/**
 * Text-only fix pass: load the generated email, then apply ONLY the critic's
 * factual corrections via the edit tools (no image involved — reliable on a 26B
 * model). Its prose is discarded; only its tool edits matter. Bounded steps.
 */
async function applyImageFixes(
  template: TemplateData,
  findings: CriticFindings,
): Promise<TemplateBuilder> {
  const builder = new TemplateBuilder();
  builder.loadTemplate(template);
  const tools = { ...createBlockTools(builder), ...createEditTools(builder) };
  const result = streamText({
    model: getModel(DEFAULT_MODEL),
    system: buildSystemPrompt({ isEdit: true }),
    messages: [
      {
        role: 'user',
        content:
          'Email actuel à corriger (chaque bloc a un id) :\n' +
          JSON.stringify(summarizeTemplateForCritic(template)) +
          '\n\n' +
          buildFixDirective(findings),
      },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: tools as any,
    stopWhen: stepCountIs(10),
    maxOutputTokens: GEN_MAX_TOKENS,
  });
  for await (const _delta of result.textStream) void _delta;
  await result.finishReason;
  return builder;
}

/**
 * Strips the model's reasoning leakage and stray markup from streamed prose,
 * line by line. Mirrors the cleaner used by the text generator.
 */
function makeProseCleaner() {
  let pending = '';
  let lastKept = '';
  const isJunk = (line: string) => {
    const t = line.trim().toLowerCase();
    if (!t) return false;
    return (
      t.startsWith('```') ||
      t.startsWith('\\') ||
      t.includes('<mjml') ||
      t.includes('<mj-') ||
      t.includes('<|') ||
      t.includes('|>') ||
      t.includes('channel') ||
      t.includes('thought') ||
      t.includes('thinking') ||
      t.includes('reasoning') ||
      t.includes('{}') ||
      /\.\w+\s*\{/.test(t) ||
      /^[\w-]+\s*:\s*[[{]/.test(t) ||
      /^\w+\s*:\s*\d+$/.test(t) ||
      /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/.test(t)
    );
  };
  const keep = (line: string): boolean => {
    if (isJunk(line)) return false;
    const t = line.trim();
    if (t && t === lastKept) return false;
    if (t) lastKept = t;
    return true;
  };
  return {
    push(chunk: string): string {
      pending += chunk;
      const parts = pending.split('\n');
      pending = parts.pop() ?? '';
      let out = '';
      for (const line of parts) if (keep(line)) out += line + '\n';
      return out;
    },
    flush(): string {
      const line = pending;
      pending = '';
      return keep(line) ? line : '';
    },
  };
}

/** Replace empty/placeholder image srcs with real stock photos from image-pipeline. */
async function resolveStockImages(builder: TemplateBuilder, baseUrl: string): Promise<void> {
  const imgs = builder.imageBlocksNeedingSrc();
  const heroQueries = builder.heroQueriesNeedingPhoto();
  if (imgs.length === 0 && heroQueries.length === 0) return;

  const queries = [...new Set([...imgs.map((b) => String(b.content.alt || 'email')), ...heroQueries])];
  const map: Record<string, string> = {};

  await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetch(`${baseUrl}/search?q=${encodeURIComponent(q)}&limit=1`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.url) map[q] = data[0].url as string;
      } catch {
        /* image service unavailable — leave placeholder, canvas handles it */
      }
    }),
  );

  for (const b of imgs) {
    const q = String(b.content.alt || 'email');
    if (map[q]) b.content.src = map[q];
  }
  builder.applyHeroPhotos(map);
}
