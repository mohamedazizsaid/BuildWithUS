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

// "Another / second / new version" of the whole thing. A request for a variant
// ("génère une deuxième version en rouge") must REBUILD-and-REPLACE the canvas —
// routing it to a normal edit made the model APPEND a whole second email below
// the first (duplicated content). Covers ordinals + "variante" + generate verbs.
const NEW_VERSION =
  /\b((une?\s+)?(autre|nouvelle?|deuxi[èe]me|seconde?|2e|troisi[èe]me|3e|another|second|new)\s+(version|variante?|mail|email|d[ée]clinaison))\b|\bune?\s+variante\b|\b(g[ée]n[èe]re\w*|cr[ée]e\w*|fai[st]\w*|produi[st]\w*|generate|create|make)\s+(moi\s+)?une?\s+(version|variante)\b/i;

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

// ── Footer append (opt out of footer-pinning) ─────────────────────────────────
// By default an edit that adds new content places it ABOVE the footer (a footer
// belongs last). But when the user explicitly wants something at the very bottom
// / after the footer, or wants to add a footer, we must NOT pin — so the new
// section can land at the end. Kept specific so a casual "le bouton en bas" that
// still wants normal placement doesn't accidentally match too broadly.
const FOOTER_APPEND =
  /\b(apr[èe]s\s+(le\s+)?(pied|footer)|sous\s+(le\s+)?(pied|footer)|tout\s+en\s+bas|[àa]\s+la\s+fin|en\s+dernier|at\s+the\s+(very\s+)?(end|bottom)|after\s+the\s+footer|ajoute\w*\s+(un\s+)?(pied\s+de\s+page|footer))\b/i;

/** Does the turn ask to add new content at the very bottom / after the footer? */
export function wantsFooterAppend(text: string): boolean {
  return FOOTER_APPEND.test(text || '');
}

// ── Legibility fix (text colors not readable) ─────────────────────────────────
// "les couleurs ne sont pas claires / c'est illisible / on ne voit pas le texte"
// is a READABILITY complaint, not a rewrite. Routed to the model with the full
// toolset, the small model tends to "reconstruct" the whole email (duplicated
// body). We instead recompute readable text colors in code (builder contrast
// logic) on the selected element (or whole email) — deterministic, keeps content.
export function wantsLegibilityFix(text: string): boolean {
  const t = (text || '').toLowerCase();
  if (
    /\b(illisibles?|unreadable|illegible|not\s+(readable|legible)|hard\s+to\s+read|peu\s+lisibles?|pas\s+(tr[èe]s\s+|assez\s+|vraiment\s+)?lisibles?|difficiles?\s+[àa]\s+lire|durs?\s+[àa]\s+lire|manque\w*\s+de\s+contraste|pas\s+assez\s+de\s+contraste)\b/i.test(
      t,
    )
  )
    return true;
  // "pas clair" only means a legibility problem when it's about text/colors —
  // never confuse it with a "passe en thème clair" theme switch.
  return (
    /\bpas\s+(tr[èe]s\s+|assez\s+|vraiment\s+)?clair/i.test(t) &&
    /\b(couleurs?|textes?|[ée]critures?|lire|lisib|voi[rt])\b/i.test(t)
  );
}

// ── Theme (light/dark) change ─────────────────────────────────────────────────
// A theme flip is a TARGETED, deterministic edit — it re-tones the existing email
// (backgrounds + every text color) while KEEPING all content and prior edits. It
// must NOT be routed to the whole-email regenerate path (which throws the user's
// work away). We apply it in code via the builder's setTheme(mood).
//
// Detection is DELIBERATELY conservative: only an explicit "switch the whole
// email to light/dark theme/mode" fires. A comparative shade tweak ("un fond plus
// clair"), or a light/dark word attached to a specific element ("carte au fond
// plus clair sur le thème sombre"), must NOT flip the whole email — that false
// positive silently destroyed a card-restyle request.
const SWITCH_CUE = /\b(passe\w*|repasse\w*|mets?|met|bascule\w*|convertis\w*|switch|make\s+it|turn\s+it|set\s+it)\b/i;
const THEME_NOUN = /\b(th[èe]me|thème|mode)\b/i;
const LIGHT_WORD = /\b(clair|claire|light)\b/i;
const DARK_WORD = /\b(sombre|noir|noire|dark)\b/i;
// Comparative ("plus clair", "lighter") = adjust a shade, NOT flip the theme.
const COMPARATIVE = /\b(plus\s+(clair|claire|sombre|fonc[ée]\w*)|un\s+peu\s+plus|l[ée]g[èe]rement\s+plus|lighter|darker|moins\s+(clair|sombre))\b/i;
// A named element means the color word scopes to THAT element, not the email.
const THEME_ELEMENT = /\b(cartes?|blocs?|box|bo[îi]te|badge|bouton|titre|sous-titre|section|paragraphe|texte|fond|arri[èe]re-plan|prix|image|photo|logo|ic[ôo]ne|barre|colonne|pied|footer|banni[èe]re)\b/i;
const WHOLE_EMAIL = /\btout\b|\bwhole\b|\bentire\b|l['’ ]?email|le\s+mail|\bthe\s+email\b/i;

/**
 * Does the turn ask to switch the WHOLE email to a light or dark theme? Returns
 * the target mood, or null. When both words appear ("light instead of dark"), the
 * FIRST one is the target — natural phrasing states the goal before the current
 * state ("passe en clair", "light instead of dark").
 */
export function wantsThemeChange(text: string): 'light' | 'dark' | null {
  const t = text || '';
  if (COMPARATIVE.test(t)) return null;
  const themedEn = /\b(light|dark)[\s-]?(theme|themed|mode)\b/i.test(t) || /-?themed\b/i.test(t);
  const themeNounColor = THEME_NOUN.test(t) && (LIGHT_WORD.test(t) || DARK_WORD.test(t));
  const enMode = /\b(en|au)\s+mode\s+(clair|sombre|nuit|jour|noir)\b/i.test(t);
  const switched =
    SWITCH_CUE.test(t) && (LIGHT_WORD.test(t) || DARK_WORD.test(t)) && (THEME_NOUN.test(t) || WHOLE_EMAIL.test(t));
  if (!(themedEn || themeNounColor || enMode || switched)) return null;
  // Color word bound to a specific element (and not the whole email) → targeted.
  if (THEME_ELEMENT.test(t) && !WHOLE_EMAIL.test(t)) return null;
  const li = t.search(LIGHT_WORD);
  const di = t.search(DARK_WORD);
  if (li < 0 && di < 0) return null;
  if (di < 0) return 'light';
  if (li < 0) return 'dark';
  return li < di ? 'light' : 'dark';
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
- "rewrite" : refaire / régénérer / reconstruire tout l'email depuis zéro, ou l'améliorer GLOBALEMENT (ex "améliore le mail", "refais le design", "make it nicer", "recommence", "une autre version"). PAS pour un simple changement de thème ou de couleur.
- "image" : ajouter, changer ou remplacer UNE image / photo / bannière / logo.
- "edit" : toute autre modification CIBLÉE, Y COMPRIS changer le thème clair/sombre, la couleur de marque, un texte, une taille, la disposition en colonnes, ajouter/supprimer/déplacer un élément ou une section (ex "passe en thème clair", "mets ça en 2 colonnes", "déplace la section").
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
