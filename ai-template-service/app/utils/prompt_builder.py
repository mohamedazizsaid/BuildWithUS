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
LAYOUT FOR THIS EMAIL: Newsletter
- Header: logo + publication name + date/edition
- Hero article: full-width image + title + excerpt + "Read more" button
- Secondary articles: 2-column grid (image + title + short text each)
- Optional: 1-column highlight or quote section
- Footer: unsubscribe link, social icons text, address
Use a clean editorial layout.""",

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

def build_prompt(user_prompt: str) -> dict:
    """
    Returns {"system": str, "user": str} for use as separate chat messages.
    """
    email_type = detect_email_type(user_prompt)
    layout_hint = _LAYOUT_HINTS.get(email_type, _LAYOUT_HINTS["generic"])
    example_mjml = _EXAMPLES.get(email_type, "")

    system = """You are an expert MJML email template generator.
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

DESIGN RULES:
- Choose colors that match the brand/context described in the prompt
- Use real placeholder text that fits the context (names, titles, amounts, dates)
- Keep it professional and visually balanced
- Do NOT output 3-column image grids unless explicitly asked for a gallery or product grid"""

    user = f"""EMAIL TYPE DETECTED: {email_type.upper()}

{layout_hint}

{"EXAMPLE STRUCTURE TO FOLLOW:" + example_mjml if example_mjml else ""}

USER REQUEST:
{user_prompt}

Generate the MJML email now. Output ONLY the MJML, nothing else."""

    return {"system": system, "user": user}
