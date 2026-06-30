import { streamText, stepCountIs } from 'ai';
import { getModel, DEFAULT_MODEL, FALLBACK_MODEL } from '@/lib/ai/provider';
import { createBlockTools, createEditTools } from '@/lib/ai/tools';
import { TemplateBuilder, frameTemplate, dedupeTemplate } from '@/lib/ai/block-factory';
import { buildSystemPrompt, buildCriticPrompt } from '@/lib/ai/system-prompt';
import {
  extractImageUrl,
  isImageIntent,
  isImageOnlyRequest,
  ensureBannerImage,
  ensurePosterBanner,
  countBlocks,
  referencesCampaign,
} from '@/lib/ai/poster-image';
import { wantsRegenerate, wantsClear, classifyIntent } from '@/lib/ai/intent';
import { buildRegenerateDirective, regenerateSeed, extractBannerUrl } from '@/lib/ai/regenerate';
import { planDesign, executeSpec } from '@/lib/ai/planner';
import { applySelectionCommand, looksLikeSelectionCommand } from '@/lib/ai/edit-commands';
import type { TemplateData } from '@/lib/editor-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const IMAGE_SEARCH_URL =
  process.env.IMAGE_SEARCH_URL || process.env.NEXT_PUBLIC_IMAGE_SEARCH_API || 'http://localhost:8002';

// Critic/refine pass after generation. On by default; set AI_REFINE=0 to skip it
// for the lowest latency (it adds one extra model call on fresh generations).
const REFINE_ENABLED = process.env.AI_REFINE !== '0';

// Hard cap on tokens generated PER model step. Without it, a small model that
// "loops" (repeats text endlessly) streams forever and eventually trips
// maxDuration → the stream aborts mid-flight ("error at input stream"). 1500 is
// ample for a tool-call step or a short chat sentence.
const GEN_MAX_TOKENS = Number(process.env.AI_GEN_MAX_TOKENS) || 1500;
// Max chat-bubble prose we forward to the client per turn. The real message
// replaces the bubble at 'done', so the streamed text is only a typing preview —
// capping it stops a rambling/looping model from filling the screen.
const PROSE_CAP = 600;

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
    poster_url?: string | null;
    campaign_context?: string | null;
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

  // ── Explicit-image handling ──────────────────────────────────────────────
  // A pasted image URL in the message, or the carried poster URL when the user
  // asks to "add the image", is placed DETERMINISTICALLY — gemma is unreliable
  // at honouring an exact URL and tends to fetch a stock photo instead.
  const posterUrl =
    typeof body.poster_url === 'string' && /^https?:|^data:image\//i.test(body.poster_url)
      ? body.poster_url
      : '';
  const campaignContext =
    typeof body.campaign_context === 'string' && body.campaign_context.trim() ? body.campaign_context.trim() : '';
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const urlInMsg = extractImageUrl(lastUser);
  const placeUrl = urlInMsg || (posterUrl && isImageIntent(lastUser) ? posterUrl : '');

  // In edit mode, if an image was explicitly requested, add it now to a working
  // copy so it's guaranteed regardless of what the model does next.
  let editTemplate = currentTemplate;
  let imageAddedDeterministically = false;
  if (isEdit && currentTemplate && placeUrl) {
    const clone: TemplateData = structuredClone(currentTemplate);
    imageAddedDeterministically = ensureBannerImage(clone, placeUrl);
    editTemplate = clone;
  }
  // Block count of the email the model starts from — used to detect a runaway
  // pass that rebuilds/duplicates instead of applying a small delta.
  const editBlockCount = editTemplate ? countBlocks(editTemplate) : 0;

  // ── Intent routing ────────────────────────────────────────────────────────
  const hasSelection = !!(selection && (selection.blockId || selection.sectionId));
  // "efface tout / vide le mail" → empty the canvas deterministically (a model
  // asked to do this removes every block → 0 blocks → wrongly read as failure).
  const doClear = isEdit && !!currentTemplate && wantsClear(lastUser);
  // Whole-email rewrite/improve → rebuild from scratch (reuse brand+content+
  // image) and REPLACE the canvas. This is what makes "améliore le mail" /
  // "réécris tout" work instead of appending a duplicate body.
  const doRegenerate = isEdit && !!currentTemplate && !placeUrl && wantsRegenerate(lastUser, { hasSelection });
  // Targeted edit on a selected element via a recognised command → applied in
  // code (no model), so "centre/agrandis/supprime le bloc sélectionné" works.
  const tryDeterministicEdit =
    isEdit && !!currentTemplate && hasSelection && !doRegenerate && looksLikeSelectionCommand(lastUser);

  // Fresh builder + tool set per attempt (so a fallback retry starts clean).
  // Edit mode pre-loads the existing email and adds targeted edit tools, so the
  // model only applies the requested delta — it never re-adds unchanged blocks.
  const makeRun = () => {
    const builder = new TemplateBuilder();
    if (isEdit && editTemplate) builder.loadTemplate(editTemplate);
    const tools = isEdit
      ? { ...createBlockTools(builder), ...createEditTools(builder) }
      : createBlockTools(builder);
    return { builder, tools };
  };

  const modelMessages: ChatMessage[] = [];
  if (isEdit && editTemplate) {
    modelMessages.push({
      role: 'user',
      content:
        "Email actuel à modifier (chaque bloc a un `id`) :\n" +
        JSON.stringify(summarizeTemplate(editTemplate)),
    });
    // Selection-scoped editing: if the user has a block/section selected in the
    // canvas, steer the model to apply the request to THAT element (unless the
    // request clearly concerns the whole email).
    const hint = selection && buildSelectionHint(editTemplate, selection);
    if (hint) modelMessages.push({ role: 'user', content: hint });
  }
  // Image guidance: either the image is already placed (don't re-add it), or
  // give the model the exact URL to use verbatim (never a stock photo).
  if (placeUrl) {
    modelMessages.push({
      role: 'user',
      content: imageAddedDeterministically
        ? "NOTE : l'image demandée a DÉJÀ été ajoutée en bannière en haut de l'email. NE la ré-ajoute pas — applique uniquement le reste de la demande, s'il y en a."
        : `IMAGE À INCLURE (src EXACT, via addImage src="${placeUrl}" width="100%") : utilise cette URL telle quelle, ne cherche AUCUNE photo de stock.`,
    });
  }
  // Carry the analysed poster's offer into the edit context when the user refers
  // to "l'offre / l'image / les forfaits" — so the model has the EXACT prices to
  // build (e.g. "ajoute l'offre de l'image dans deux box").
  if (isEdit && campaignContext && referencesCampaign(lastUser)) {
    modelMessages.push({
      role: 'user',
      content:
        "DONNÉES DE LA CAMPAGNE (extraites de l'affiche analysée — utilise ces valeurs EXACTES, n'invente aucun prix) :\n" +
        campaignContext,
    });
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
          maxOutputTokens: GEN_MAX_TOKENS,
        });
        const prose = await pumpProse(result.textStream, cleaner, send);
        await result.finishReason; // rejects on model error
        return { builder, prose };
      };

      // A whole-email REGENERATE pass: fresh builder pre-seeded with the brand,
      // BASE generation prompt, and a directive carrying the current copy +
      // banner. It rebuilds a clean, improved email (no preloaded canvas → it
      // cannot append/duplicate). Mirrors the image route's generation shape.
      const regenerateAttempt = async (modelId: string, directive: string, seed: ReturnType<typeof regenerateSeed>) => {
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
          system: buildSystemPrompt({ isEdit: false }),
          messages: [{ role: 'user', content: directive }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: tools as any,
          stopWhen: stepCountIs(36),
          maxOutputTokens: GEN_MAX_TOKENS,
        });
        const prose = await pumpProse(result.textStream, cleaner, send);
        await result.finishReason;
        return { builder, prose };
      };

      // Run the 3-pass regenerate and finalize it (refine → banner/stock → frame).
      // Shared by the explicit regenerate intent and the runaway-edit fallback.
      const runRegenerate = async (): Promise<boolean> => {
        if (!currentTemplate) return false;
        send({ type: 'status', stage: 'rebuild' });
        let directive = buildRegenerateDirective(currentTemplate, lastUser, posterUrl || undefined);
        if (campaignContext) {
          directive += "\n\nOFFRE DE LA CAMPAGNE (valeurs EXACTES à inclure, n'invente aucun prix) :\n" + campaignContext;
        }
        const seed = regenerateSeed(currentTemplate);
        const banner = extractBannerUrl(currentTemplate, posterUrl || undefined);
        let chosen: { builder: TemplateBuilder; prose: string } | null = null;
        let fromPlanner = false;

        // Phase 2: plan the redesign, build deterministically (preferred).
        try {
          const spec = await planDesign({
            brief: directive,
            seed: { accentColor: seed.accentColor, backgroundColor: seed.backgroundColor, mood: seed.mood },
          });
          if (spec && spec.sections.length >= 3) {
            const builder = executeSpec(spec);
            if (builder.blockCount > 0) {
              chosen = { builder, prose: 'Voici une version améliorée.' };
              fromPlanner = true;
            }
          }
        } catch {
          /* fall back to agentic */
        }

        // Fallback: agentic regenerate (up to 3 passes).
        if (!chosen) {
          const passes = [DEFAULT_MODEL, FALLBACK_MODEL, DEFAULT_MODEL];
          for (let i = 0; i < passes.length; i++) {
            try {
              const r = await regenerateAttempt(passes[i], directive, seed);
              if (r.builder.blockCount > 0) {
                chosen = r;
                break;
              }
            } catch {
              /* try next model */
            }
            if (i < passes.length - 1) send({ type: 'status', stage: 'retry' });
          }
        }
        if (!chosen) return false;

        // Critic polish (best-effort, surgical) — skip for planner output, which
        // is already complete and in its own design system.
        let finalBuilder = chosen.builder;
        if (REFINE_ENABLED && !fromPlanner) {
          send({ type: 'status', stage: 'refine' });
          try {
            const orig = chosen.builder.blockCount;
            const refined = await refinePass(chosen.builder.build(), lastUser);
            const rc = refined.blockCount;
            if (rc >= orig - 2 && rc <= orig + 8) finalBuilder = refined;
          } catch {
            /* keep generation */
          }
        }

        send({ type: 'status', stage: 'template' });
        let built: TemplateData;
        if (banner) {
          built = ensurePosterBanner(finalBuilder.build(), banner);
        } else {
          await resolveStockImages(finalBuilder, IMAGE_SEARCH_URL);
          built = finalBuilder.build();
        }
        send({ type: 'done', message: chosen.prose.trim() || 'Voici une version améliorée.', template: frameTemplate(dedupeTemplate(built)) });
        return true;
      };

      try {
        // Empty the canvas (no model). globalStyles are kept so a follow-up
        // rebuild can reuse the brand if wanted.
        const clearNow = () => {
          send({ type: 'status', stage: 'template' });
          send({
            type: 'done',
            message: "J'ai vidé l'email. Décrivez le nouveau modèle à créer.",
            template: { rows: [], globalStyles: currentTemplate!.globalStyles },
          });
        };

        // Fast path: obvious "efface tout" (instant, no model).
        if (doClear && currentTemplate) {
          clearNow();
          return;
        }

        // Fast path: a recognised command on a SELECTED element (centre, agrandis,
        // supprime, couleur…) is applied in code — instant and reliable, no model.
        if (tryDeterministicEdit && currentTemplate && selection) {
          const t: TemplateData = structuredClone(currentTemplate);
          const res = applySelectionCommand(t, selection, lastUser);
          if (res.applied) {
            send({ type: 'status', stage: 'template' });
            send({ type: 'done', message: res.message, template: dedupeTemplate(t) });
            return;
          }
          // not a clean match → fall through to the model edit path
        }

        // Whole-email rewrite/improve → clean rebuild that REPLACES the canvas.
        if (doRegenerate) {
          const ok = await runRegenerate();
          if (ok) return;
          // rebuild failed → fall through to the normal path rather than erroring
        }

        // Fast path: a pure "add / use this image" request in edit mode is fully
        // satisfied by the deterministic placement above — skip the model
        // entirely (instant, and it can't duplicate or drift to a stock photo).
        if (isEdit && editTemplate && placeUrl && isImageOnlyRequest(lastUser)) {
          send({ type: 'status', stage: 'template' });
          send({
            type: 'done',
            message: imageAddedDeterministically
              ? "J'ai ajouté l'image en bannière en haut de l'email."
              : "Cette image est déjà présente dans l'email.",
            template: dedupeTemplate(editTemplate),
          });
          return;
        }

        // Understanding fallback: no instant shortcut fired. Ask the model what
        // the user MEANS (works for any phrasing/language — "empty the email",
        // "scrap it", "rends-le plus beau"…) and route accordingly. This is what
        // lets the assistant understand intent instead of matching keywords.
        if (isEdit && currentTemplate) {
          const act = await classifyIntent(lastUser);
          if (act === 'clear') {
            clearNow();
            return;
          }
          if (act === 'rewrite') {
            const ok = await runRegenerate();
            if (ok) return;
          }
          // 'edit' / 'image' / null → continue to the agentic edit path below.
        }

        let chosen: { builder: TemplateBuilder; prose: string } | null = null;
        let lastErr: unknown = null;
        // Planner output is already complete + clean + in a chosen design system,
        // so the critic (which runs in the default system) must NOT touch it.
        let fromPlanner = false;

        // Fresh generation → PLAN the design and build it deterministically
        // (Phase 2). Preferred over the agentic loop; falls back to it on failure.
        if (!isEdit) {
          send({ type: 'status', stage: 'planning' });
          try {
            const spec = await planDesign({ brief: lastUser });
            if (spec && spec.sections.length >= 3) {
              const builder = executeSpec(spec);
              if (builder.blockCount > 0) {
                chosen = { builder, prose: 'Voici votre email.' };
                fromPlanner = true;
              }
            }
          } catch (e) {
            lastErr = e;
          }
        }

        // Small models occasionally "think out loud" and call no tools, leaving
        // an empty email. Try up to 3 passes (alternating models) until one
        // actually produces blocks. The frontend replaces the bubble with the
        // final message, so transient prose from a discarded pass is harmless.
        const passes = [DEFAULT_MODEL, FALLBACK_MODEL, DEFAULT_MODEL];

        for (let i = 0; !chosen && i < passes.length; i++) {
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
          if (REFINE_ENABLED && !isEdit && !fromPlanner) {
            send({ type: 'status', stage: 'refine' });
            try {
              const refineUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
              const orig = chosen.builder.blockCount;
              const refined = await refinePass(chosen.builder.build(), refineUser);
              // Accept only a SURGICAL refinement: a few blocks added/removed.
              // A large jump means the model re-generated/duplicated the email —
              // discard it and keep the clean original.
              const rc = refined.blockCount;
              if (rc >= orig - 2 && rc <= orig + 8) finalBuilder = refined;
            } catch {
              /* keep the original generation */
            }
          }

          // Edit-mode runaway guard: catches a pass that DUPLICATES the email
          // (re-emits the whole body). The allowance is generous so a legitimate
          // large add — e.g. "ajoute l'offre dans deux box" onto a short email —
          // is NOT mistaken for duplication; rewrite/improve intents are already
          // siphoned to the planner regenerate path, so true duplication is rare.
          const runaway = isEdit && finalBuilder.blockCount > editBlockCount * 2 + 12;
          if (runaway && currentTemplate) {
            const ok = await runRegenerate();
            if (ok) return;
            send({ type: 'status', stage: 'template' });
            send({
              type: 'done',
              message: imageAddedDeterministically
                ? "J'ai ajouté l'image. Pour retoucher le design, sélectionnez un élément ou demandez « réécris tout le mail »."
                : "J'ai gardé votre email tel quel. Sélectionnez l'élément à changer, ou demandez « réécris tout le mail » pour une nouvelle version.",
              template: dedupeTemplate(editTemplate ?? currentTemplate),
            });
            return;
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
    maxOutputTokens: GEN_MAX_TOKENS,
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
/**
 * Drive a model's text stream into the client as chat-bubble prose, with two
 * guards against a looping/rambling model: keep DRAINING the whole stream (so
 * tool calls still run to completion), but only FORWARD/STORE up to PROSE_CAP
 * characters. Returns the (capped) prose. Combined with `maxOutputTokens` on the
 * streamText call, this makes a runaway generation finite AND visually short.
 */
async function pumpProse(
  textStream: AsyncIterable<string>,
  cleaner: ReturnType<typeof makeProseCleaner>,
  send: (obj: unknown) => void,
): Promise<string> {
  let prose = '';
  let forwarded = 0;
  const emit = (cleaned: string) => {
    if (!cleaned || forwarded >= PROSE_CAP) return;
    const piece = cleaned.slice(0, PROSE_CAP - forwarded);
    prose += piece;
    forwarded += piece.length;
    send({ type: 'delta', text: piece });
  };
  for await (const delta of textStream) emit(cleaner.push(delta));
  emit(cleaner.flush());
  return prose;
}

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
