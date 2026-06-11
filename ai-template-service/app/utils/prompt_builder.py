"""
prompt_builder.py — Adaptive MJML prompt builder.

Detects the email type from the user's prompt and injects
type-specific layout guidance + a few-shot MJML example so the
model generates a structure that actually matches the request.
"""

# ── Email type detection ────────────────────────────────────────────────────

_TYPE_KEYWORDS = {
    "badge":        ["badge", "carte", "card", "identité", "identity", "employe", "employé",
                     "employee", "staff", "personnel", "member", "access", "accès", "qr"],
    "invoice":      ["facture", "invoice", "devis", "quote", "commande", "order", "payment",
                     "paiement", "receipt", "reçu", "billing", "total", "montant", "amount"],
    "welcome":      ["bienvenue", "welcome", "onboarding", "inscription", "register",
                     "nouveau compte", "new account", "créé", "created", "signup"],
    "newsletter":   ["newsletter", "actualité", "news", "article", "blog", "édition",
                     "edition", "hebdo", "mensuel", "weekly", "monthly"],
    "promo":        ["promo", "promotion", "offre", "offer", "remise", "discount", "solde",
                     "sale", "réduction", "deal", "coupon", "code"],
    "confirmation": ["confirmation", "confirme", "confirmed", "réservation", "booking",
                     "rendez-vous", "appointment", "livraison", "delivery", "suivi", "track"],
    "reminder":     ["rappel", "reminder", "relance", "follow-up", "n'oubliez pas",
                     "don't forget", "expiration", "expire", "deadline"],
    "schedule":     ["emploi du temps", "planning", "schedule", "timetable", "agenda",
                     "horaire", "semaine", "hebdomadaire", "hybride", "hybrid", "tableau",
                     "réunion", "meetings", "calendrier"],
    "notification": ["notification", "alerte", "alert", "mise à jour", "update",
                     "activité", "activity", "connexion", "login"],
}

def detect_email_type(prompt: str) -> str:
    lower = prompt.lower()
    scores = dict.fromkeys(_TYPE_KEYWORDS, 0)
    for email_type, keywords in _TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                scores[email_type] += 1
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "generic"
    # When multiple types tie, prefer the more specific/structural ones
    PRIORITY = ["schedule", "invoice", "badge", "confirmation", "promo",
                "reminder", "notification", "newsletter", "welcome"]
    top_score = scores[best]
    candidates = [t for t in PRIORITY if scores[t] == top_score]
    return candidates[0] if candidates else best


# ── Type-specific layout guidance ──────────────────────────────────────────

_LAYOUT_HINTS = {
    "badge": """
LAYOUT FOR THIS EMAIL: Employee / Member Badge Card
- Header: company name + logo on a colored background (1 column, full width)
- Badge card: 2-column section — LEFT column (40%) has a circular avatar image, RIGHT column (60%) has employee name (large, bold), job title (colored), and details (ID, department, start date) as text
- Access section: 1-column, centered message or access QR info
- CTA button: e.g. "Download Badge" or "View Profile"
- Footer: HR contact info, keep it simple
DO NOT use 3-column image grids. DO NOT repeat information across columns.""",

    "invoice": """
LAYOUT FOR THIS EMAIL: Invoice / Payment Receipt
- Header: company logo left, invoice title right (2-column)
- Billing info: 2-column — sender details LEFT, recipient details RIGHT
- Items summary: 1-column full-width, use a simple text table or list (mj-text with <br /> rows)
- Total section: right-aligned amount, highlighted background
- CTA: "View Invoice" or "Pay Now" button
- Footer: payment terms, contact info
Use a clean, professional look with neutral colors.""",

    "welcome": """
LAYOUT FOR THIS EMAIL: Welcome / Onboarding
- Hero: full-width image with overlay text or a large bold title section
- Welcome message: 1-column warm paragraph
- 2–3 feature highlights: use a 2 or 3-column section with icon-like images + short text
- CTA button: "Get Started" or "Access My Account"
- Footer: support contact
Use friendly, inviting colors.""",

    "newsletter": """
LAYOUT FOR THIS EMAIL: Newsletter (editorial / magazine feel)
- Top strip: a thin solid bar with a small letter-spaced line — issue number · date · reading time
- Masthead: the publication name as a LARGE display title (centered), a letter-spaced tagline under it, then a short centered 48px accent divider
- Pull-quote / intro: one centered italic-feeling sentence inset (padding "0 70px"), with a "— La rédaction" attribution below in muted gray
- Hero article: full-width image, then an eyebrow label ("À LA UNE · …"), a bold title, an excerpt, and a "Lire l'article →" button (left-aligned)
- "À ne pas manquer" section: 2 article rows that ALTERNATE image side (42/58 then 58/42), each with a numbered eyebrow ("01 — CATÉGORIE"), title, excerpt, and a small "LIRE →" link; separate the two rows with a thin full-width divider
- "En bref" block: an eyebrow label + a few "→ …" one-line items with line-height 2
- Footer: solid dark bar — brand name, a short divider, copyright + reason-for-receiving, then letter-spaced "Se désinscrire · Préférences · Voir dans le navigateur" links in the accent
Keep most sections transparent; only the top strip and footer are solidly colored.""",

    "promo": """
LAYOUT FOR THIS EMAIL: Promotional Offer
- Hero banner: full-width bold image with promotion headline as large text overlay section
- Offer detail: 1-column centered — discount code in a styled box (background + border), expiry
- Product highlights: 2 or 3-column grid with product images + names + prices
- CTA: big prominent button ("Shop Now", "Claim Offer")
- Footer: terms, unsubscribe
Use high-contrast colors matching the brand.""",

    "confirmation": """
LAYOUT FOR THIS EMAIL: Order / Booking Confirmation
- Header: logo + "Confirmation" title
- Confirmation box: 1-column section with light background, confirmation number in large bold text
- Details: 2-column — item/service LEFT, date/price RIGHT (use mj-text with line breaks)
- Status indicator: colored text section ("Your order is confirmed ✓")
- CTA: "Track Order" or "View Booking"
- Footer: support contact, cancellation policy""",

    "reminder": """
LAYOUT FOR THIS EMAIL: Reminder
- Header: logo + urgency indicator (e.g. "Action Required")
- Main message: 1-column, clear and concise reminder text
- Details box: 1-column section with light background listing what / when / where
- CTA: action button
- Footer: contact info""",

    "notification": """
LAYOUT FOR THIS EMAIL: Notification / Alert
- Header: small logo + notification type label
- Icon + message: 1 or 2-column — icon image LEFT, alert message RIGHT
- Details: 1-column clean text
- CTA if needed
- Footer: settings link
Keep it compact and focused.""",

    "schedule": """
LAYOUT FOR THIS EMAIL: Schedule / Planning / Timetable
- Header: company name + email purpose (e.g. "Votre emploi du temps")
- Intro text: 1-column brief welcome paragraph
- Schedule table: 1-column full-width mj-table with days as columns and time slots as rows
  - Include real data: fill each cell with either the activity name or "Télétravail" / "Bureau" for hybrid schedules
  - NEVER leave the table empty
- Footer: contact info or note
Use clear, readable colors. Table header row should have a colored background matching the brand.""",

    "generic": """
LAYOUT: Adapt intelligently to the user's request.
- Analyze the context and choose the most appropriate structure
- Use headers, content sections, and a footer
- Only add images where they genuinely make sense
- Match the formality and tone of the request""",
}


# ── Few-shot MJML examples per type ────────────────────────────────────────

_EXAMPLES = {
    "badge": """
EXAMPLE OUTPUT for a badge email:

<mjml>
  <mj-body background-color="#f0f0f0" width="600px">
    <mj-section background-color="#C0392B" padding="20px 0">
      <mj-column width="100%">
        <mj-text font-size="26px" font-weight="bold" color="#ffffff" align="center" padding="10px" font-family="Arial, sans-serif" line-height="1.2">
          COMPANY NAME
        </mj-text>
        <mj-text font-size="13px" font-weight="normal" color="#f8d7d7" align="center" padding="0 10px 10px" font-family="Arial, sans-serif" line-height="1.4">
          Official Employee Badge
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="30px 20px">
      <mj-column width="40%">
        <mj-image src="PLACEHOLDER_AVATAR" alt="employee photo" width="120px" border-radius="60px" align="center" padding="0" />
      </mj-column>
      <mj-column width="60%">
        <mj-text font-size="22px" font-weight="bold" color="#2C3E50" align="left" padding="0 0 6px 0" font-family="Arial, sans-serif" line-height="1.2">
          John Smith
        </mj-text>
        <mj-text font-size="15px" font-weight="bold" color="#C0392B" align="left" padding="0 0 12px 0" font-family="Arial, sans-serif" line-height="1.4">
          Grill Master
        </mj-text>
        <mj-text font-size="13px" font-weight="normal" color="#555555" align="left" padding="0" font-family="Arial, sans-serif" line-height="1.8">
          ID: BP-2024-789<br />Department: Kitchen<br />Start: January 15, 2024
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#f8f8f8" padding="20px">
      <mj-column width="100%">
        <mj-text font-size="13px" font-weight="normal" color="#777777" align="center" padding="0 0 16px 0" font-family="Arial, sans-serif" line-height="1.6">
          This badge grants access to all kitchen areas.<br />Keep it visible at all times while on premises.
        </mj-text>
        <mj-button background-color="#C0392B" color="#ffffff" font-size="14px" font-weight="bold" font-family="Arial, sans-serif" border-radius="6px" href="#" padding="12px 28px" align="center" line-height="1.5">
          Download Badge PDF
        </mj-button>
      </mj-column>
    </mj-section>
    <mj-section background-color="#2C3E50" padding="16px">
      <mj-column width="100%">
        <mj-text font-size="12px" font-weight="normal" color="#aaaaaa" align="center" padding="0" font-family="Arial, sans-serif" line-height="1.6">
          HR Department · hr@company.com · +1 (555) 000-0000
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
""",

    "schedule": """
EXAMPLE mj-table for a hybrid week schedule (use plain th/td, no style attributes):

<mj-table font-size="13px" color="#333333" padding="10px">
  <tr><th>Jour</th><th>Matin (9h-13h)</th><th>Après-midi (14h-18h)</th><th>Mode</th></tr>
  <tr><td>Lundi</td><td>Réunion d'équipe</td><td>Développement</td><td>Bureau</td></tr>
  <tr><td>Mardi</td><td>Développement</td><td>Code review</td><td>Télétravail</td></tr>
  <tr><td>Mercredi</td><td>Sprint planning</td><td>Développement</td><td>Bureau</td></tr>
  <tr><td>Jeudi</td><td>Développement</td><td>Tests QA</td><td>Télétravail</td></tr>
  <tr><td>Vendredi</td><td>Demo retro</td><td>Documentation</td><td>Bureau</td></tr>
</mj-table>
""",

    "generic": "",  # no forced example for generic — let the model be creative
}


# ── Main builder ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are an expert MJML email template generator.
You output ONLY valid MJML — no markdown, no code fences, no explanations, no comments.
Your output must start with <mjml> and end with </mjml>.

MJML SYNTAX RULES:
- Wrap everything: <mjml><mj-body width="600px" background-color="..."> ... </mj-body></mjml>
- Rows use <mj-section background-color="..." padding="...">
- Columns use <mj-column width="50%"> (always use % for column widths: 100%, 50%, 33.33%, 40%, 60%, etc.)
- Text: <mj-text font-size="16px" font-weight="normal" color="#333" align="left" padding="10px" font-family="Arial, sans-serif" line-height="1.5">content</mj-text>
  - Inside mj-text: only plain text, <br />, <strong>, <em>, <a href="...">
- Images: <mj-image src="PLACEHOLDER_IMAGE" alt="description" width="100%" padding="10px" align="center" border-radius="0px" />
  - For circular avatars: width="120px" border-radius="60px"
  - Images are ALWAYS self-closing with />
- Buttons: <mj-button background-color="#color" color="#fff" font-size="14px" font-weight="bold" font-family="Arial, sans-serif" border-radius="6px" href="#" padding="12px 24px" align="center">Label</mj-button>
- Dividers: <mj-divider border-color="#ddd" border-width="1px" padding="10px 0" />
- Tables — CRITICAL RULES:
  * Use <mj-table font-size="14px" color="#333333" padding="10px">
  * ALWAYS fill the table with real data rows — NEVER generate an empty table
  * Use plain <th>header</th> and <td>value</td> — do NOT add style attributes (they are added automatically)
  * NEVER use <table>, <thead>, <tbody> — only mj-table with <tr><th> and <tr><td>
  * Example of correct table:
  <mj-table font-size="14px" color="#333333" padding="10px">
    <tr><th>Lundi</th><th>Mardi</th><th>Mercredi</th><th>Jeudi</th><th>Vendredi</th></tr>
    <tr><td>Bureau</td><td>Télétravail</td><td>Bureau</td><td>Télétravail</td><td>Bureau</td></tr>
    <tr><td>9h-17h</td><td>9h-17h</td><td>9h-17h</td><td>9h-17h</td><td>9h-17h</td></tr>
  </mj-table>

DESIGN SYSTEM — this is what separates a generic template from a beautiful, art-directed one. Follow it closely.

1. COLOR — restraint over rainbows
   - Build the WHOLE email from ONE accent color + a tonal neutral ramp. NEVER default to a generic "SaaS blue" like #4a6cf7.
   - Derive a ramp: a near-black (#1c1917 / #0f172a), two or three muted grays for secondary text (#78716c, #a8a29e), an off-white surface (#fdfcfa / #faf9f7), and a body background that is slightly tinted, not pure white (#efece6 / #f5f3ee).
   - Use the accent SPARINGLY — eyebrow labels, one button, a thin divider. If every section is filled with color, it looks cheap.
   - Most sections should be background-color="transparent". Reserve SOLID fills for the header, the hero, and the footer only.

2. TYPOGRAPHY — hierarchy and detailing carry the design
   - DISPLAY headings: 28-44px, font-weight 700-800, line-height 1.1-1.25, letter-spacing="-1px" (tight). These anchor the email.
   - BODY: 15-17px, line-height 1.6-1.8, normal weight, a muted dark gray — not pure black.
   - EYEBROW / KICKER labels: tiny (10-11px) BOLD uppercase-style labels placed ABOVE headings, in the accent or a muted gray, with letter-spacing 2-4px — e.g. "À LA UNE · ANALYSE", "01 — CATÉGORIE", "EN BREF". These are the single strongest signal of a designed email. Use them.
   - Use letter-spacing deliberately: positive (2-4px) on small labels, negative (-1px) on large headings, 0 on body.

3. SPACING — generous, asymmetric rhythm
   - Major sections open with generous top padding (36-48px) and lighter bottoms. Do NOT pad everything with a uniform "10px" / "20px".
   - Inset body text horizontally for readability: padding="0 40px", or "0 70px" for a quote. Never run paragraphs edge-to-edge.
   - Separate movements with thin CENTERED accent dividers (mj-divider width="48px" align="center"), not only full-width lines.

4. LAYOUT — editorial, not template-y
   - Alternate 2-column image/text splits and REVERSE them between sections (42/58, then 58/42) for rhythm.
   - AVOID the symmetric 3-column "icon + title + text" feature grid — it is the #1 generic-template cliché. Only use it when explicitly asked for a gallery or product/feature grid.
   - Add one editorial touch that fits the type: an issue/date line, a pull-quote with attribution, a numbered list.

5. POLISH
   - Choose a button radius that matches the mood and keep it consistent: border-radius="0" for sober/editorial, 6-8px for friendly/modern.
   - Body width may be 600-640px.
   - Use real placeholder copy that fits the context (names, titles, amounts, dates) — never "lorem ipsum" or "lol".
   - Aim for the feeling of a thoughtfully art-directed email, not a form filled into a wireframe."""


def _layout_and_example(email_type: str) -> tuple[str, str]:
    layout_hint = _LAYOUT_HINTS.get(email_type, _LAYOUT_HINTS["generic"])
    example_mjml = _EXAMPLES.get(email_type, "")
    return layout_hint, example_mjml


def build_prompt(user_prompt: str) -> dict:
    """
    Returns {"system": str, "user": str} for use as separate chat messages.
    Free-text path: detects the email type from the user's sentence.
    """
    email_type = detect_email_type(user_prompt)
    layout_hint, example_mjml = _layout_and_example(email_type)

    user = f"""EMAIL TYPE DETECTED: {email_type.upper()}

{layout_hint}

{"EXAMPLE STRUCTURE TO FOLLOW:" + example_mjml if example_mjml else ""}

USER REQUEST:
{user_prompt}

Generate the MJML email now. Output ONLY the MJML, nothing else."""

    return {"system": _SYSTEM_PROMPT, "user": user}


# ── Structured brief builder ─────────────────────────────────────────────────

_LANG_NAMES = {"fr": "French", "en": "English"}
_TONE_HINTS = {
    "professional": "professional, polished and concise",
    "friendly": "warm, friendly and approachable",
    "playful": "playful, energetic and fun",
}


def build_brief_prompt(brief: dict) -> dict:
    """
    Build the chat messages from a structured wizard brief (see frontend AiBrief).
    The email type is chosen by the user, so we skip keyword detection (falling
    back to it only if the type is missing). All known fields are injected as
    explicit constraints; missing fields are left for the model to invent.
    """
    free_text = (brief.get("free_text") or "").strip()
    email_type = (brief.get("email_type") or "").strip().lower()
    if not email_type:
        email_type = detect_email_type(free_text) if free_text else "generic"

    layout_hint, example_mjml = _layout_and_example(email_type)

    lang = (brief.get("language") or "fr").lower()
    lang_name = _LANG_NAMES.get(lang, "French")
    tone_hint = _TONE_HINTS.get((brief.get("tone") or "professional").lower(),
                                _TONE_HINTS["professional"])

    # ── Brand / colors ──
    brand = brief.get("brand") or {}
    brand_lines: list[str] = []
    if brand.get("company"):
        brand_lines.append(f"- Company name: {brand['company']} (show it in the header/first section)")
    if brand.get("logo_url"):
        brand_lines.append(f"- Logo image URL: {brand['logo_url']} (use as the logo in the first section)")
    if brand.get("primary_color"):
        brand_lines.append(f"- PRIMARY color {brand['primary_color']} — use for buttons, headers and key accents")
    if brand.get("accent_color"):
        brand_lines.append(f"- ACCENT color {brand['accent_color']} — use for secondary highlights, links")
    if brand.get("background_color"):
        brand_lines.append(f"- BACKGROUND color {brand['background_color']} — use for mj-body background-color")
    brand_block = ("BRAND & COLORS (use these exact values):\n" + "\n".join(brand_lines)
                   if brand_lines else
                   "BRAND & COLORS: none provided — pick a cohesive palette that fits the email type.")

    # ── Content ──
    content = brief.get("content") or {}
    content_lines: list[str] = []
    if content.get("headline"):
        content_lines.append(f"- Headline / title: {content['headline']}")
    if content.get("message"):
        content_lines.append(f"- Main message / body: {content['message']}")
    if content.get("cta_label"):
        href = content.get("cta_url") or "#"
        content_lines.append(f'- Call-to-action button: "{content["cta_label"]}" linking to {href}')
    for key, val in (content.get("extras") or {}).items():
        if val:
            label = key.replace("_", " ")
            content_lines.append(f"- {label}: {val}")
    content_block = ("CONTENT TO INCLUDE (use this real content, do not replace it):\n"
                     + "\n".join(content_lines)
                     if content_lines else
                     "CONTENT: none provided — write suitable realistic placeholder copy for this email type.")

    extra_block = f"\nADDITIONAL INSTRUCTIONS:\n{free_text}\n" if free_text else ""

    user = f"""EMAIL TYPE: {email_type.upper()}

{layout_hint}

{"EXAMPLE STRUCTURE TO FOLLOW:" + example_mjml if example_mjml else ""}

WRITING:
- Write ALL copy in {lang_name}.
- Tone: {tone_hint}.

{brand_block}

{content_block}
{extra_block}
Generate the MJML email now. Output ONLY the MJML, nothing else."""

    return {"system": _SYSTEM_PROMPT, "user": user}


# ── Conversational (chat) builder ─────────────────────────────────────────────

# Chat-specific output contract laid on top of the shared design system. The
# model must reply with one short sentence (which becomes the chat bubble) and
# then the full MJML — the service splits the two on the first <mjml> tag.
_CHAT_ADDENDUM = """

CONVERSATION MODE:
You are chatting with a user who is designing ONE email template together with you, turn by turn.

YOUR REPLY FORMAT — every single turn, no exceptions:
1. FIRST, write exactly ONE short, friendly sentence (in the user's language) describing what you just created or changed. No greetings, no lists, no markdown — just one sentence.
2. THEN, on the next line, output the COMPLETE MJML document (<mjml> … </mjml>).
Nothing else before, between, or after.

EDITING RULES:
- When the user asks for a change, modify ONLY what they asked for and PRESERVE everything else exactly — same copy, colors, images, structure.
- ALWAYS output the FULL document, never a fragment, diff, or "...".
- Keep existing real image URLs (https://…) unchanged. Only use PLACEHOLDER_IMAGE for brand-new images you add."""


def build_chat_prompt(messages: list[dict], current_mjml: str | None) -> list[dict]:
    """
    Build the OpenRouter chat-messages array for the conversational builder.

    `messages` is the running text conversation [{role, content}, …] where the
    LAST item is the user's newest request and assistant turns are the short
    sentences (no MJML). `current_mjml` is the template as it stands now, or
    None on the very first turn (fresh creation).

    Returns a list ready to send as the `messages` payload.
    """
    latest = (messages[-1]["content"] if messages else "").strip()
    history = messages[:-1] if messages else []

    out: list[dict] = [{"role": "system", "content": _SYSTEM_PROMPT + _CHAT_ADDENDUM}]

    # Replay prior text turns for continuity (these carry no MJML, so they're cheap).
    for m in history:
        role = m.get("role")
        content = (m.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            out.append({"role": role, "content": content})

    if current_mjml and "<mj-section" in current_mjml:
        # Edit turn — hand the model the template as it stands and the new ask.
        final = (
            "CURRENT TEMPLATE (edit this — keep everything I don't explicitly ask to change):\n"
            f"{current_mjml.strip()}\n\n"
            f"MY REQUEST: {latest}\n\n"
            "Reply with ONE short sentence about what you changed, then the COMPLETE updated MJML."
        )
    else:
        # First / fresh turn — detect the type and inject layout guidance + example.
        email_type = detect_email_type(latest) if latest else "generic"
        layout_hint, example_mjml = _layout_and_example(email_type)
        example_block = ("EXAMPLE STRUCTURE TO FOLLOW:" + example_mjml) if example_mjml else ""
        final = (
            f"EMAIL TYPE DETECTED: {email_type.upper()}\n\n"
            f"{layout_hint}\n\n"
            f"{example_block}\n\n"
            f"MY REQUEST: {latest}\n\n"
            "Reply with ONE short sentence, then the COMPLETE MJML document."
        )

    out.append({"role": "user", "content": final})
    return out
