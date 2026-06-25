import { streamText, stepCountIs } from 'ai';
import { getModel, DEFAULT_MODEL, FALLBACK_MODEL } from '@/lib/ai/provider';
import { createBlockTools, createEditTools } from '@/lib/ai/tools';
import { TemplateBuilder, frameTemplate, dedupeTemplate } from '@/lib/ai/block-factory';
import { buildSystemPrompt, buildCriticPrompt } from '@/lib/ai/system-prompt';
import type { TemplateData } from '@/lib/editor-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const IMAGE_SEARCH_URL =
  process.env.IMAGE_SEARCH_URL || process.env.NEXT_PUBLIC_IMAGE_SEARCH_API || 'http://localhost:8002';

// Critic/refine pass after generation. On by default; set AI_REFINE=0 to skip it
// for the lowest latency (it adds one extra model call on fresh generations).
const REFINE_ENABLED = process.env.AI_REFINE !== '0';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Tool-based email generation. The model assembles the email by calling block
 * tools (see lib/ai/tools.ts); we accumulate the result into a Template and
 * stream it back. Replaces the old MJML-text generation path.
 *
 * Stream protocol (newline-delimited JSON), matching the frontend parser:
 *   { type: "delta",  text }            incremental chat-bubble prose
 *   { type: "status", stage: "template" } building / resolving the template
 *   { type: "done",   message, template } final result
 *   { type: "error",  error }
 */
interface Selection {
  blockId?: string | null;
  sectionId?: string | null;
}

export async function POST(req: Request): Promise<Response> {
  let body: {
    messages?: ChatMessage[];
    current_template?: TemplateData | null;
    selection?: Selection | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const currentTemplate = body.current_template ?? null;
  const selection = body.selection ?? null;
  if (messages.length === 0) {
    return Response.json({ error: 'No messages provided' }, { status: 400 });
  }

  const isEdit = !!currentTemplate;
  const system = buildSystemPrompt({ isEdit });

  // Fresh builder + tool set per attempt (so a fallback retry starts clean).
  // Edit mode pre-loads the existing email and adds targeted edit tools, so the
  // model only applies the requested delta — it never re-adds unchanged blocks.
  const makeRun = () => {
    const builder = new TemplateBuilder();
    if (isEdit && currentTemplate) builder.loadTemplate(currentTemplate);
    const tools = isEdit
      ? { ...createBlockTools(builder), ...createEditTools(builder) }
      : createBlockTools(builder);
    return { builder, tools };
  };

  const modelMessages: ChatMessage[] = [];
  if (isEdit && currentTemplate) {
    modelMessages.push({
      role: 'user',
      content:
        "Email actuel à modifier (chaque bloc a un `id`) :\n" +
        JSON.stringify(summarizeTemplate(currentTemplate)),
    });
    // Selection-scoped editing: if the user has a block/section selected in the
    // canvas, steer the model to apply the request to THAT element (unless the
    // request clearly concerns the whole email).
    const hint = selection && buildSelectionHint(currentTemplate, selection);
    if (hint) modelMessages.push({ role: 'user', content: hint });
  }
  modelMessages.push(...messages);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      // One full generation pass with a given model. Fresh builder + tools +
      // prose buffer per attempt, so a retry starts from a clean slate. Throws
      // on provider error; otherwise returns the populated builder + its prose.
      const attempt = async (modelId: string) => {
        const { builder, tools } = makeRun();
        const cleaner = makeProseCleaner();
        let prose = '';
        const result = streamText({
          model: getModel(modelId),
          system,
          messages: modelMessages,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: tools as any,
          // A rich email (hero + intro + 2-3 content sections + card + footer)
          // can be ~25-30 tool calls; keep enough headroom so the footer isn't
          // truncated mid-generation.
          stopWhen: stepCountIs(36),
        });
        for await (const delta of result.textStream) {
          const cleaned = cleaner.push(delta);
          if (cleaned) {
            prose += cleaned;
            send({ type: 'delta', text: cleaned });
          }
        }
        const tail = cleaner.flush();
        if (tail) {
          prose += tail;
          send({ type: 'delta', text: tail });
        }
        await result.finishReason; // rejects on model error
        return { builder, prose };
      };

      try {
        // Small models occasionally "think out loud" and call no tools, leaving
        // an empty email. Try up to 3 passes (alternating models) until one
        // actually produces blocks. The frontend replaces the bubble with the
        // final message, so transient prose from a discarded pass is harmless.
        const passes = [DEFAULT_MODEL, FALLBACK_MODEL, DEFAULT_MODEL];
        let chosen: { builder: TemplateBuilder; prose: string } | null = null;
        let lastErr: unknown = null;

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

        if (!chosen) {
          send({
            type: 'error',
            error:
              lastErr instanceof Error
                ? lastErr.message
                : "Aucun bloc généré. Reformulez votre demande.",
          });
        } else {
          // Critic pass: one fast review that fixes real defects (stray quotes,
          // missing footer/CTA, redundant blocks) without rebuilding. Best-effort
          // and bounded — never blocks the result if it fails or empties things.
          let finalBuilder = chosen.builder;
          if (REFINE_ENABLED && !isEdit) {
            send({ type: 'status', stage: 'refine' });
            try {
              const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
              const orig = chosen.builder.blockCount;
              const refined = await refinePass(chosen.builder.build(), lastUser);
              // Accept only a SURGICAL refinement: a few blocks added/removed.
              // A large jump means the model re-generated/duplicated the email —
              // discard it and keep the clean original.
              const rc = refined.blockCount;
              if (rc >= orig - 2 && rc <= orig + 8) finalBuilder = refined;
            } catch {
              /* keep the original generation */
            }
          }

          send({ type: 'status', stage: 'template' });
          await resolveStockImages(finalBuilder, IMAGE_SEARCH_URL);
          // Drop any duplicated sections (the critic occasionally re-emits one),
          // then frame the outer corners on the FINAL row set.
          const template = dedupeTemplate(finalBuilder.build());
          send({ type: 'done', message: chosen.prose.trim(), template: isEdit ? template : frameTemplate(template) });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur de génération';
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Critic pass: load the freshly built email into a new builder (edit mode +
 * full tool set), let the model fix real defects, and return the refined
 * builder. Its prose is discarded — only its tool edits matter. Bounded by a
 * small step budget so it stays fast.
 */
async function refinePass(template: TemplateData, userRequest: string): Promise<TemplateBuilder> {
  const builder = new TemplateBuilder();
  builder.loadTemplate(template);
  const tools = { ...createBlockTools(builder), ...createEditTools(builder) };
  const result = streamText({
    model: getModel(DEFAULT_MODEL),
    system: buildCriticPrompt(),
    messages: [
      {
        role: 'user',
        content:
          `Demande initiale de l'utilisateur : « ${userRequest} ». ` +
          'Vérifie que l\'email y répond (si un élément demandé manque — ex barre de couleurs, carte d\'offre, liste — ajoute-le).\n\n' +
          'Email à relire et corriger si nécessaire :\n' +
          JSON.stringify(summarizeTemplate(template)),
      },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: tools as any,
    stopWhen: stepCountIs(10),
  });
  // Drain the stream to drive the tool calls; the critic's text is not shown.
  for await (const _delta of result.textStream) void _delta;
  await result.finishReason;
  return builder;
}

/**
 * Build a steering instruction describing the element the user selected in the
 * canvas, so the model scopes its edit to that block/section. Returns null when
 * the selection can't be resolved (stale id) — the model then edits as usual.
 */
function buildSelectionHint(t: TemplateData, sel: Selection): string | null {
  const snippet = (s: unknown) =>
    typeof s === 'string' ? s.replace(/<[^>]+>/g, '').trim().slice(0, 40) : '';
  if (sel.blockId) {
    for (const r of t.rows)
      for (const c of r.columns)
        for (const b of c.blocks)
          if (b.id === sel.blockId) {
            const txt = snippet(b.content.text);
            return (
              `CONTEXTE DE SÉLECTION : l'utilisateur a sélectionné UN bloc précis dans l'éditeur — ` +
              `id="${b.id}", type="${b.type}"${txt ? `, texte="${txt}"` : ''} (dans la section sectionId="${r.id}"). ` +
              `Applique la demande à CE bloc en priorité (updateBlock / setImage / removeBlock / moveBlock selon le cas), ` +
              `SAUF si la demande concerne clairement tout l'email (ex « passe tout en sombre ») ou un autre élément nommé explicitement.`
            );
          }
  }
  if (sel.sectionId) {
    const idx = t.rows.findIndex((r) => r.id === sel.sectionId);
    if (idx >= 0)
      return (
        `CONTEXTE DE SÉLECTION : l'utilisateur a sélectionné UNE section entière — ` +
        `sectionId="${sel.sectionId}" (section n°${idx + 1}). ` +
        `Applique la demande à CETTE section (updateSection / updateCard / removeSection / moveSection, ou updateBlock sur ses blocs), ` +
        `SAUF si la demande concerne clairement tout l'email.`
      );
  }
  return null;
}

/** Compact view of a template for edit mode — includes each block's id so the
 * model can target it with updateBlock/removeBlock. */
function summarizeTemplate(t: TemplateData) {
  // Include the styles the model actually edits (padding/align/colors) so it can
  // see the CURRENT state and target precisely — e.g. fix a left-aligned block,
  // or know a section's existing padding before changing it.
  const pick = (s: Record<string, string>, keys: string[]) => {
    const out: Record<string, string> = {};
    for (const k of keys) if (s[k]) out[k] = s[k];
    return out;
  };
  return {
    sections: t.rows.map((r) => ({
      sectionId: r.id,
      layout: r.layout,
      sectionStyles: pick(r.styles, ['padding', 'backgroundColor', 'borderRadius', 'backgroundUrl']),
      card: r.columns[0]?.styles?.border || r.columns[0]?.styles?.backgroundColor
        ? pick(r.columns[0].styles as Record<string, string>, ['padding', 'backgroundColor', 'border', 'borderRadius'])
        : undefined,
      blocks: r.columns.flatMap((c) =>
        c.blocks.map((b) => ({
          id: b.id,
          type: b.type,
          content: b.content,
          styles: pick(b.styles, ['padding', 'textAlign', 'color', 'backgroundColor', 'fontSize']),
        })),
      ),
    })),
  };
}

/**
 * Strips the model's reasoning leakage (e.g. gemma emits a standalone "thought"
 * line) and any stray markup/code fences from the streamed prose, line by line.
 */
function makeProseCleaner() {
  let pending = '';
  let lastKept = ''; // for de-duping the repeated intro/conclusion lines
  const isJunk = (line: string) => {
    const t = line.trim().toLowerCase();
    if (!t) return false;
    return (
      t.startsWith('```') ||
      t.startsWith('\\') || // pseudo-tool leakage: "\.endSection{}"
      t.includes('<mjml') ||
      t.includes('<mj-') ||
      // gemma channel/thinking control tokens & reasoning leak
      t.includes('<|') ||
      t.includes('|>') ||
      t.includes('channel') ||
      t.includes('thought') ||
      t.includes('thinking') ||
      t.includes('reasoning') ||
      t.includes('{}') || // "endSection{}", "nextColumn{}"
      /\.\w+\s*\{/.test(t) || // ".addText{...", "\.endSection{}"
      /^[\w-]+\s*:\s*[[{]/.test(t) || // tool-plan dumps: "pipelined: [setTheme, ...]"
      /^\w+\s*:\s*\d+$/.test(t) || // metadata lines like "samples: 1"
      // bare kebab-case slugs the model sometimes emits as a "name" line
      /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/.test(t)
    );
  };
  const keep = (line: string): boolean => {
    if (isJunk(line)) return false;
    const t = line.trim();
    if (t && t === lastKept) return false; // drop consecutive duplicate lines
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

  const queries = [
    ...new Set([...imgs.map((b) => String(b.content.alt || 'email')), ...heroQueries]),
  ];
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
  // Hero background photos (resolved query → url; drops the temp query key even
  // if unresolved, so it never leaks into the saved template).
  builder.applyHeroPhotos(map);
}
