/**
 * Lightweight, deterministic intent router for an edit-mode chat turn.
 *
 * The small model can't be trusted to decide whether a request means "tweak
 * this one block", "redo the whole thing", or "just add an image". Mis-routing
 * is what caused the worst failures (an "improve everything" ask treated as an
 * append-only edit → duplicated email, or blocked by the runaway guard with a
 * dead-end message). So we classify the turn here, by keyword, before any model
 * call and pick the right execution path.
 */

// "Rewrite / redo from scratch" verbs (accent-insensitive where it matters).
const REWRITE_VERB =
  /\b(r[ée][ée]cri\w*|recommenc\w*|refai\w*|refais|redessine\w*|redesign\w*|refont\w*|recr[ée]\w*|r[ée]g[ée]n[èe]r\w*|regener\w*|repart\w*\s+(de\s+)?z[ée]ro)\b/i;

// "Make it nicer / less basic / more premium" — a quality, whole-email ask.
const IMPROVE =
  /\b(am[ée]liore\w*|embelli\w*|sublime\w*|plus\s+(beau|belle|joli\w*|premium|moderne|pro|soign[ée]\w*|class\w*)|moins\s+(basi\w*|fade|plat\w*|simple)|c['’]est\s+(trop\s+)?(basi\w*|fade|plat\w*|simple)|fais\w*\s+(plus\s+)?(beau|pro|premium))\b/i;

// "Another / new version" of the whole thing.
const NEW_VERSION =
  /\b(autre\s+version|nouvelle\s+version|un\s+autre\s+(mail|email)|un\s+nouveau\s+(mail|email)|une\s+autre\s+version)\b/i;

// References to the whole email (scope = global).
const GLOBAL_SCOPE =
  /\b(le\s+mail|l['’]?\s?email|tout\s+l\w*|tout\s+le\s+mail|l['’]ensemble|ensemble\s+du|globale?ment|enti[èe]rement|compl[èe]tement|toute\s+la\s+page)\b/i;

// A specific element — means the ask is targeted, NOT a whole-email rewrite.
const ELEMENT_WORD =
  /\b(titre|sous-titre|en-t[êe]te|bouton|cta|image|photo|logo|section|paragraphe|texte|prix|forfait|carte|pied|footer|lien|menu|banni[èe]re)\b/i;

/**
 * Does this turn ask to regenerate/restructure the WHOLE email (vs. a targeted
 * edit)? Such turns are rebuilt from scratch (reusing brand + content + image)
 * and REPLACE the canvas, instead of appending onto it.
 */
export function wantsRegenerate(text: string, opts: { hasSelection: boolean }): boolean {
  const t = text || '';
  if (REWRITE_VERB.test(t) || NEW_VERSION.test(t)) return true;
  if (IMPROVE.test(t)) {
    // "améliore le titre" → targeted; "améliore le mail" / bare "améliore" → global.
    if (GLOBAL_SCOPE.test(t)) return true;
    if (!ELEMENT_WORD.test(t) && !opts.hasSelection) return true;
  }
  return false;
}

// An erase verb + a whole-email scope = "empty the email". Handled in code (a
// model asked to "tout effacer" removes every block → 0 blocks, which the
// generation path wrongly reads as failure).
const ERASE_VERB = /\b(efface\w*|vide[rz]?|supprime\w*|enl[èe]ve\w*|retire\w*|nettoie\w*|clear|reset)\b/i;
const ALL_SCOPE = /\b(tout|tous|toute\s+la\s+page|toutes?\s+les\s+sections?|l['’]?\s?email|le\s+mail|l['’]ensemble|enti[èe]re?ment)\b/i;

/** Does the turn ask to CLEAR the whole email (start from an empty canvas)? */
export function wantsClear(text: string): boolean {
  const t = text || '';
  return ERASE_VERB.test(t) && ALL_SCOPE.test(t);
}

// ── Model-based intent understanding ──────────────────────────────────────────
// The regexes above are fast instant-positives. But they can't understand every
// phrasing or language ("empty the email", "scrap it and start over", "هذا سيء").
// So when no instant shortcut fires, we ask the model to CLASSIFY the request
// into one action — classification is something a small model does reliably,
// unlike long tool-call execution — and then we execute deterministically.

const CLS_BASE = process.env.AI_BASE_URL;
const CLS_KEY = process.env.AI_API_KEY;
const CLS_MODEL = process.env.AI_MODEL || 'gemma4-26b';

export type EditAction = 'clear' | 'rewrite' | 'image' | 'edit';

const CLASSIFY_SYSTEM = `Tu classifies la demande d'un utilisateur qui modifie un email DÉJÀ existant. Réponds UNIQUEMENT par un JSON {"intent":"..."} avec exactement UNE de ces valeurs :
- "clear" : vider / tout effacer / tout supprimer / repartir d'une page blanche (ex "empty the email", "efface tout", "vide le mail", "remove everything", "delete it all", "on recommence à blanc").
- "rewrite" : refaire / régénérer / améliorer GLOBALEMENT tout l'email, ou changer l'ambiance générale (ex "améliore le mail", "refais le design", "make it nicer", "passe tout en sombre").
- "image" : ajouter, changer ou remplacer UNE image / photo / bannière / logo.
- "edit" : toute autre modification CIBLÉE (un texte, une couleur, une taille, ajouter/supprimer un élément précis, une section, un bouton, etc.).
En cas de doute, réponds "edit". Ne réponds RIEN d'autre que le JSON.`;

/**
 * Classify an edit-mode request into one action using the model's understanding.
 * Schema-constrained + tiny output, so it's fast and reliable. Returns null if
 * the server is unavailable or the output is unusable (caller defaults to 'edit').
 */
export async function classifyIntent(message: string): Promise<EditAction | null> {
  if (!CLS_BASE || !CLS_KEY || !message.trim()) return null;
  try {
    const res = await fetch(`${CLS_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CLS_KEY}` },
      body: JSON.stringify({
        model: CLS_MODEL,
        temperature: 0,
        max_tokens: 20,
        messages: [
          { role: 'system', content: CLASSIFY_SYSTEM },
          { role: 'user', content: message },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'intent',
            strict: true,
            schema: {
              type: 'object',
              properties: { intent: { type: 'string', enum: ['clear', 'rewrite', 'image', 'edit'] } },
              required: ['intent'],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? '';
    const m = /"intent"\s*:\s*"(clear|rewrite|image|edit)"/.exec(raw);
    return m ? (m[1] as EditAction) : null;
  } catch {
    return null;
  }
}
