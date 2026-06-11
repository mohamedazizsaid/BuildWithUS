import json
import logging
import os
import re

import httpx

from app.utils.prompt_builder import build_brief_prompt, build_chat_prompt, build_prompt

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

IMAGE_SEARCH_API = os.getenv("IMAGE_SEARCH_API", "http://localhost:8002")

_GENERIC_ALT_WORDS = {"image", "photo", "picture", "placeholder", "avatar"}

# Curated palettes used instantly while the AI suggestion loads, and as a
# robust fallback when OpenRouter is unavailable or returns junk. Keyed by
# email type; "generic" is the catch-all.
_FALLBACK_PALETTES: dict[str, list[dict]] = {
    "generic": [
        {"name": "Slate",   "primary": "#0f172a", "accent": "#3b82f6", "background": "#f8fafc", "text": "#1e293b"},
        {"name": "Emerald", "primary": "#065f46", "accent": "#10b981", "background": "#f0fdf4", "text": "#064e3b"},
        {"name": "Indigo",  "primary": "#3730a3", "accent": "#6366f1", "background": "#eef2ff", "text": "#1e1b4b"},
        {"name": "Amber",   "primary": "#92400e", "accent": "#f59e0b", "background": "#fffbeb", "text": "#451a03"},
    ],
    "promo": [
        {"name": "Sunset",  "primary": "#be123c", "accent": "#fb7185", "background": "#fff1f2", "text": "#4c0519"},
        {"name": "Electric","primary": "#7c3aed", "accent": "#a78bfa", "background": "#f5f3ff", "text": "#2e1065"},
        {"name": "Citrus",  "primary": "#ea580c", "accent": "#fdba74", "background": "#fff7ed", "text": "#431407"},
        {"name": "Mint",    "primary": "#0d9488", "accent": "#5eead4", "background": "#f0fdfa", "text": "#042f2e"},
    ],
    "invoice": [
        {"name": "Corporate","primary": "#1e3a8a", "accent": "#3b82f6", "background": "#f8fafc", "text": "#0f172a"},
        {"name": "Neutral",  "primary": "#334155", "accent": "#64748b", "background": "#ffffff", "text": "#1e293b"},
        {"name": "Forest",   "primary": "#14532d", "accent": "#22c55e", "background": "#f7fee7", "text": "#052e16"},
        {"name": "Graphite", "primary": "#111827", "accent": "#6b7280", "background": "#f9fafb", "text": "#111827"},
    ],
    "welcome": [
        {"name": "Sky",     "primary": "#0369a1", "accent": "#38bdf8", "background": "#f0f9ff", "text": "#082f49"},
        {"name": "Bloom",   "primary": "#9d174d", "accent": "#f472b6", "background": "#fdf2f8", "text": "#500724"},
        {"name": "Sunrise", "primary": "#c2410c", "accent": "#fb923c", "background": "#fff7ed", "text": "#431407"},
        {"name": "Lagoon",  "primary": "#0e7490", "accent": "#22d3ee", "background": "#ecfeff", "text": "#083344"},
    ],
}

def _fix_image_tag_width(tag_match: re.Match) -> str:
    """Convert non-100% percentage widths inside an mj-image tag to px."""
    def _replace(m: re.Match) -> str:
        val = float(m.group(1))
        if val == 100:
            return m.group(0)
        return f'width="{max(50, int(val * 6))}px"'
    return re.sub(r'\bwidth="(\d+(?:\.\d+)?)%"', _replace, tag_match.group(0))


class AiService:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY is not set in environment variables")
        self.url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = os.getenv("AI_MODEL", "deepseek/deepseek-v3.2")

        # Ordered fallback chain for the chat builder. Free models are each
        # served by a single upstream provider that rate-limits hard (429); when
        # one is throttled we transparently retry the next. Override/extend with
        # AI_MODEL_FALLBACKS (comma-separated). The primary AI_MODEL goes first.
        default_fallbacks = [
            "openai/gpt-oss-120b:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "qwen/qwen3-next-80b-a3b-instruct:free",
        ]
        env_fallbacks = [
            m.strip() for m in os.getenv("AI_MODEL_FALLBACKS", "").split(",") if m.strip()
        ]
        chain = [self.model, *(env_fallbacks or default_fallbacks)]
        # De-dupe while preserving order.
        self.chat_models = list(dict.fromkeys(chain))

    async def generate_template(self, prompt: str = "", brief: dict | None = None, **_kwargs):
        if brief:
            logger.info(f"[AI] Generating template from brief — type: {brief.get('email_type', '?')}")
            messages_payload = build_brief_prompt(brief)
            # Fallback query for Pexels: headline → free_text → raw prompt
            content = brief.get("content") or {}
            image_query = (content.get("headline") or brief.get("free_text") or prompt or "").strip()
        else:
            logger.info(f"[AI] Generating template — type detection running for: '{prompt[:80]}'")
            messages_payload = build_prompt(prompt)
            image_query = prompt

        messages = [
            {"role": "system", "content": messages_payload["system"]},
            {"role": "user",   "content": messages_payload["user"]},
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 8000,   # richer, art-directed templates run long — don't truncate mid-output
            "temperature": 0.4,   # low enough for consistent structure, enough for variety
        }

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(
                    self.url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    content=json.dumps(payload),
                )
                logger.info(f"[AI] OpenRouter status: {response.status_code}")

                try:
                    data = response.json()
                except json.JSONDecodeError:
                    logger.error("[AI] OpenRouter returned non-JSON")
                    return {"error": "OpenRouter API returned invalid response", "body": response.text}

                if "error" in data:
                    logger.error(f"[AI] OpenRouter error: {data['error']}")
                    return {"error": data["error"].get("message", str(data["error"]))}

                try:
                    mjml = "".join(
                        choice["message"]["content"]
                        for choice in data.get("choices", [])
                        if choice.get("message") and choice["message"].get("content")
                    )
                except Exception as e:
                    logger.error(f"[AI] Failed to parse choices: {e}")
                    return {"error": "Failed to parse OpenRouter response", "body": data}

        except Exception as e:
            logger.exception("[AI] HTTP error calling OpenRouter")
            return {"error": str(e)}

        if not mjml.strip():
            return {"error": "AI returned empty response"}

        # Extract just the <mjml>...</mjml> block (strip any surrounding text / markdown)
        mjml_match = re.search(r"<mjml[\s\S]*?</mjml>", mjml, re.IGNORECASE)
        if mjml_match:
            mjml = mjml_match.group(0)
        else:
            logger.warning("[AI] Could not find <mjml> block in response — using raw output")

        # Clean up common AI output issues
        mjml = self._sanitize_mjml(mjml)

        # Inject inline styles into bare <th>/<td> inside mj-table, add css-class
        mjml = self._style_tables(mjml)

        # Replace placeholder image URLs with real Pexels photos
        mjml = await self._inject_stock_images(mjml, image_query)

        logger.info("[AI] Template generation complete")
        return {"mjml": mjml}

    # ── Conversational chat generation ─────────────────────────────────────────

    async def _chat_completion(
        self,
        messages: list[dict],
        max_tokens: int,
        temperature: float,
    ) -> tuple[str, str | None]:
        """
        Call OpenRouter, walking the fallback model chain on rate-limit / provider
        errors. Returns (content, error) — exactly one is meaningful.
        """
        last_error = "AI service unavailable"
        async with httpx.AsyncClient(timeout=90.0) as client:
            for model in self.chat_models:
                payload = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }
                try:
                    response = await client.post(
                        self.url,
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        content=json.dumps(payload),
                    )
                except Exception as e:
                    logger.warning(f"[AI chat] HTTP error on {model}: {e}")
                    last_error = str(e)
                    continue

                logger.info(f"[AI chat] {model} → status {response.status_code}")
                try:
                    data = response.json()
                except json.JSONDecodeError:
                    last_error = "OpenRouter API returned invalid response"
                    continue

                if "error" in data:
                    err = data["error"]
                    code = err.get("code") if isinstance(err, dict) else None
                    last_error = (err.get("message") if isinstance(err, dict) else str(err)) or last_error
                    # 429 / provider issues → try the next model in the chain.
                    if code in (429, 502, 503) or response.status_code in (429, 502, 503):
                        logger.warning(f"[AI chat] {model} rate-limited/unavailable, trying next")
                        continue
                    return "", last_error

                content = "".join(
                    choice["message"]["content"]
                    for choice in data.get("choices", [])
                    if choice.get("message") and choice["message"].get("content")
                )
                if content.strip():
                    return content, None
                last_error = "AI returned empty response"

        logger.error(f"[AI chat] all models exhausted: {last_error}")
        return "", last_error

    async def chat_template(
        self,
        messages: list[dict],
        current_mjml: str | None = None,
    ) -> dict:
        """
        One turn of the conversational builder. Returns {"message", "mjml"} where
        `message` is a short assistant sentence for the chat bubble and `mjml` is
        the full updated template. On failure returns {"error": ...}.
        """
        if not messages:
            return {"error": "No messages provided"}

        chat_messages = build_chat_prompt(messages, current_mjml)
        # Fallback image query: the user's newest request.
        image_query = (messages[-1].get("content") or "").strip()

        raw, err = await self._chat_completion(chat_messages, max_tokens=8000, temperature=0.4)
        if err:
            return {"error": err}
        if not raw.strip():
            return {"error": "AI returned empty response"}

        # Split the reply: prose before <mjml> is the chat message, the block is the template.
        raw = re.sub(r"```(?:mjml|xml|html)?\s*", "", raw).replace("```", "")
        mjml_match = re.search(r"<mjml[\s\S]*?</mjml>", raw, re.IGNORECASE)
        if not mjml_match:
            # No template in the reply — treat the whole thing as a chat message.
            return {"message": raw.strip()[:500], "mjml": ""}

        mjml = mjml_match.group(0)
        message = raw[: mjml_match.start()].strip() or "Voici votre modèle."

        mjml = self._sanitize_mjml(mjml)
        mjml = self._style_tables(mjml)
        mjml = await self._inject_stock_images(mjml, image_query)

        logger.info("[AI chat] Turn complete")
        return {"message": message, "mjml": mjml}

    # ── Palette suggestion ───────────────────────────────────────────────────

    @staticmethod
    def _validate_palettes(raw: list) -> list[dict]:
        """Keep only well-formed palettes with valid hex colors."""
        hex_re = re.compile(r"^#[0-9a-fA-F]{6}$")
        keys = ("primary", "accent", "background", "text")
        out: list[dict] = []
        for p in raw if isinstance(raw, list) else []:
            if not isinstance(p, dict):
                continue
            if all(isinstance(p.get(k), str) and hex_re.match(p[k]) for k in keys):
                out.append({
                    "name": str(p.get("name", "Palette"))[:30],
                    **{k: p[k] for k in keys},
                })
        return out[:4]

    async def suggest_palettes(self, email_type: str, vibe: str | None = None) -> list[dict]:
        """
        Suggest 4 cohesive color palettes for an email type. Falls back to a
        curated static set on any error so the wizard never blocks.
        """
        fallback = _FALLBACK_PALETTES.get(email_type, _FALLBACK_PALETTES["generic"])

        vibe_line = f" The brand vibe is: {vibe}." if vibe else ""
        system = (
            "You are a brand color expert. Return STRICT JSON only — no markdown, no prose. "
            "Each palette must use harmonious, accessible colors."
        )
        user = (
            f"Suggest 4 distinct color palettes for a '{email_type}' marketing email.{vibe_line} "
            'Return JSON of the form: {"palettes": [{"name": "...", "primary": "#rrggbb", '
            '"accent": "#rrggbb", "background": "#rrggbb", "text": "#rrggbb"}, ...]}. '
            "primary = buttons/headers, accent = highlights, background = body, text = body text. "
            "Use 6-digit lowercase hex. Ensure text is readable on background."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": 500,
            "temperature": 0.6,
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    self.url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    content=json.dumps(payload),
                )
                data = response.json()
                if "error" in data:
                    logger.warning(f"[AI palettes] OpenRouter error: {data['error']}")
                    return fallback
                content = "".join(
                    choice["message"]["content"]
                    for choice in data.get("choices", [])
                    if choice.get("message") and choice["message"].get("content")
                )
        except Exception as e:
            logger.warning(f"[AI palettes] HTTP error, using fallback: {e}")
            return fallback

        json_match = re.search(r"\{[\s\S]*\}", content)
        if not json_match:
            return fallback
        try:
            parsed = json.loads(json_match.group(0))
        except json.JSONDecodeError:
            return fallback

        palettes = self._validate_palettes(parsed.get("palettes", []))
        return palettes if palettes else fallback

    # ── Variable mapping ─────────────────────────────────────────────────────

    async def map_variables(
        self,
        template_vars: list[str],
        file_columns: list[str],
        sample_row: dict | None = None,
    ) -> dict:
        """
        Ask the model to map template variables to file columns by semantic meaning.
        Returns { template_var: file_column | None }.
        """
        if not template_vars or not file_columns:
            return {}

        sample_lines = ""
        if sample_row:
            sample_lines = "Example values from the first row:\n" + "\n".join(
                f"  - {col}: {str(sample_row.get(col, ''))[:80]}"
                for col in file_columns
            )

        system = (
            "You are a strict JSON-only assistant that maps template placeholders to data "
            "columns. Match by semantic meaning across languages (French ↔ English ↔ others). "
            "Use the example values to disambiguate. If no good match exists for a template "
            "variable, return null for it. Each template variable maps to AT MOST one file column. "
            "Return ONLY a JSON object — no markdown, no explanation."
        )
        user = (
            f"Template variables: {json.dumps(template_vars)}\n"
            f"File columns: {json.dumps(file_columns)}\n"
            f"{sample_lines}\n\n"
            "Return JSON of the form: { \"template_var\": \"file_column_or_null\", ... }"
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": 800,
            "temperature": 0.1,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    content=json.dumps(payload),
                )
                data = response.json()
                if "error" in data:
                    logger.error(f"[AI map] OpenRouter error: {data['error']}")
                    raise RuntimeError(data["error"].get("message", "AI error"))
                content = "".join(
                    choice["message"]["content"]
                    for choice in data.get("choices", [])
                    if choice.get("message") and choice["message"].get("content")
                )
        except Exception:
            logger.exception("[AI map] HTTP error")
            raise

        json_match = re.search(r"\{[\s\S]*\}", content)
        if not json_match:
            logger.warning(f"[AI map] No JSON found in: {content[:200]}")
            return {}

        try:
            raw = json.loads(json_match.group(0))
        except json.JSONDecodeError as e:
            logger.warning(f"[AI map] JSON parse failed: {e}")
            return {}

        valid_cols = set(file_columns)
        valid_vars = set(template_vars)
        cleaned: dict[str, str | None] = {}
        for k, v in raw.items():
            if k not in valid_vars:
                continue
            if isinstance(v, str) and v in valid_cols:
                cleaned[k] = v
            else:
                cleaned[k] = None
        return cleaned

    # ── Invoice field mapping ────────────────────────────────────────────────

    async def map_invoice_fields(
        self,
        targets: list[dict],          # [{path, label, type, hint}]
        file_columns: list[str],
        already_matched: list[dict] | None = None,
        sample_row: dict | None = None,
    ) -> dict:
        """
        Map remaining invoice schema fields to file columns. Unlike generic
        variable mapping, the target schema is fixed and known — we pass labels,
        types, and hints to help the model reason about which column fits.
        """
        if not targets or not file_columns:
            return {}

        sample_lines = ""
        if sample_row:
            sample_lines = "\nExample values from the first row:\n" + "\n".join(
                f"  - {col}: {str(sample_row.get(col, ''))[:80]}"
                for col in file_columns
            )

        already_str = ""
        if already_matched:
            already_str = "\nAlready matched (do NOT reuse these columns):\n" + "\n".join(
                f"  - {m['target']} ← {m['column']}" for m in already_matched
            )

        targets_str = "\n".join(
            f"  - {t['path']} ({t['label']}, type={t['type']}{', e.g. ' + t['hint'] if t.get('hint') else ''})"
            for t in targets
        )
        used_columns = {m["column"] for m in (already_matched or [])}
        available_str = ", ".join(c for c in file_columns if c not in used_columns) or "(none)"

        system = (
            "You map columns from a data file to fields of a STRICT invoice schema. "
            "The target schema is fixed — every invoice has these fields. Each target "
            "has a TYPE (string, number, date, email, siret, etc.) — only match a "
            "column whose example value plausibly satisfies the type. Return null when "
            "no column fits — never invent a match. Each target maps to AT MOST one "
            "column, and each column is used AT MOST once. Output STRICT JSON only."
        )
        user = (
            f"Available columns: {available_str}\n\n"
            f"Targets to map:\n{targets_str}\n"
            f"{already_str}{sample_lines}\n\n"
            "Return JSON: { \"target_path\": \"column_or_null\", ... }"
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            "max_tokens": 1000,
            "temperature": 0.1,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    content=json.dumps(payload),
                )
                data = response.json()
                if "error" in data:
                    logger.error(f"[AI invoice-map] OpenRouter error: {data['error']}")
                    raise RuntimeError(data["error"].get("message", "AI error"))
                content = "".join(
                    choice["message"]["content"]
                    for choice in data.get("choices", [])
                    if choice.get("message") and choice["message"].get("content")
                )
        except Exception:
            logger.exception("[AI invoice-map] HTTP error")
            raise

        json_match = re.search(r"\{[\s\S]*\}", content)
        if not json_match:
            logger.warning(f"[AI invoice-map] No JSON found in: {content[:200]}")
            return {}
        try:
            raw = json.loads(json_match.group(0))
        except json.JSONDecodeError as e:
            logger.warning(f"[AI invoice-map] JSON parse failed: {e}")
            return {}

        valid_paths = {t["path"] for t in targets}
        valid_cols = set(file_columns)
        # Enforce: each column used at most once, only valid paths returned.
        used: set[str] = set()
        cleaned: dict[str, str | None] = {}
        for path, col in raw.items():
            if path not in valid_paths:
                continue
            if isinstance(col, str) and col in valid_cols and col not in used:
                cleaned[path] = col
                used.add(col)
            else:
                cleaned[path] = None
        return cleaned

    # ── Sanitizer ────────────────────────────────────────────────────────────

    @staticmethod
    def _sanitize_mjml(mjml: str) -> str:
        """
        Fix common AI output issues without breaking valid MJML structure.
        """
        # Strip markdown code fences if the model wrapped the output
        mjml = re.sub(r"```(?:mjml|xml|html)?\s*", "", mjml)
        mjml = mjml.replace("```", "")

        # Fix self-closing tags that the model sometimes forgets
        mjml = re.sub(r"<mj-image([^>]*[^/])>", r"<mj-image\1 />", mjml)
        mjml = re.sub(r"<mj-divider([^>]*[^/])>", r"<mj-divider\1 />", mjml)

        # Fix "/ />" typo
        mjml = mjml.replace("/ />", "/>")

        # Only fix non-100% % widths inside mj-image tags (columns need % widths — don't touch them)
        mjml = re.sub(r"<mj-image\b[^>]*/?>", _fix_image_tag_width, mjml, flags=re.IGNORECASE)

        return mjml

    # ── Table styler ─────────────────────────────────────────────────────────

    @staticmethod
    def _style_tables(mjml: str) -> str:
        """
        Post-process mj-table blocks:
        - Ensure css-class="tb:#dddddd:#f1f5f9" is present
        - Inject border/padding inline styles into bare <th> and <td> tags
        - Remove empty <tr></tr> placeholders the model sometimes emits
        """
        BORDER   = "1px solid #dddddd"
        HDR_BG   = "#f1f5f9"
        CELL_PAD = "padding:8px"

        TH_STYLE = f'style="border:{BORDER};{CELL_PAD};background:{HDR_BG};font-weight:bold;text-align:left"'
        TD_STYLE = f'style="border:{BORDER};{CELL_PAD};text-align:left"'

        def process_table(m: re.Match) -> str:
            open_tag: str = m.group(1)
            body: str     = m.group(2)

            # Add / normalise css-class attribute (insert before the closing >)
            if 'css-class=' not in open_tag:
                open_tag = open_tag.rstrip().rstrip('>').rstrip() + ' css-class="tb:#dddddd:#f1f5f9">'
            else:
                open_tag = re.sub(
                    r'css-class="[^"]*"',
                    'css-class="tb:#dddddd:#f1f5f9"',
                    open_tag,
                )

            # Remove purely empty rows: <tr></tr> or <tr>   </tr>
            body = re.sub(r'<tr>\s*</tr>', '', body, flags=re.IGNORECASE)

            # Inject style into <th> tags that don't already have one
            body = re.sub(
                r'<th(?!\s[^>]*style=)([^>]*)>',
                lambda mm: f'<th {TH_STYLE}{mm.group(1)}>',
                body,
                flags=re.IGNORECASE,
            )

            # Inject style into <td> tags that don't already have one
            body = re.sub(
                r'<td(?!\s[^>]*style=)([^>]*)>',
                lambda mm: f'<td {TD_STYLE}{mm.group(1)}>',
                body,
                flags=re.IGNORECASE,
            )

            return f'{open_tag}{body}</mj-table>'

        return re.sub(
            r'(<mj-table\b[^>]*>)([\s\S]*?)</mj-table>',
            process_table,
            mjml,
            flags=re.IGNORECASE,
        )

    # ── Image injection ───────────────────────────────────────────────────────

    async def _inject_stock_images(self, mjml: str, prompt: str) -> str:
        """Replace placeholder src values with real Pexels photos.

        Only placeholder/empty srcs are touched — any src that is already a real
        URL (http/https) is left alone. This keeps existing images stable across
        conversational edit turns instead of re-rolling them every message.
        """
        src_pattern = re.compile(
            r'(<mj-image\b[^>]*?\bsrc=")([^"]*?)("[^>]*/?>)',
            re.IGNORECASE | re.DOTALL,
        )
        matches = [
            m for m in src_pattern.finditer(mjml)
            if not m.group(2).strip().lower().startswith(("http://", "https://"))
        ]
        if not matches:
            return mjml

        queries = [self._query_for_match(m, prompt) for m in matches]
        image_map = await self._fetch_images(queries)
        if not image_map:
            return mjml

        return self._replace_srcs(mjml, matches, queries, image_map)

    @staticmethod
    def _query_for_match(m: re.Match, fallback: str) -> str:
        alt_match = re.search(r'\balt="([^"]*)"', m.group(0), re.IGNORECASE)
        q = (alt_match.group(1).strip() if alt_match else "").lower()
        return fallback if (not q or q in _GENERIC_ALT_WORDS) else q

    @staticmethod
    async def _fetch_images(queries: list) -> dict:
        image_map: dict[str, str] = {}
        unique = list(dict.fromkeys(queries))
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                for q in unique:
                    try:
                        resp = await client.get(
                            f"{IMAGE_SEARCH_API}/search",
                            params={"q": q, "limit": 3},
                        )
                        resp.raise_for_status()
                        results = resp.json()
                        if results:
                            image_map[q] = results[0]["url"]
                    except Exception as e:
                        logger.warning(f"[Images] Search failed for '{q[:40]}': {e}")
        except Exception as e:
            logger.warning(f"[Images] Image API unavailable: {e}")
        return image_map

    @staticmethod
    def _replace_srcs(mjml: str, matches: list, queries: list, image_map: dict) -> str:
        result = mjml
        for m, q in zip(matches, queries, strict=False):
            url = image_map.get(q)
            if not url:
                continue
            safe_url = url.replace("&", "&amp;")
            result = result.replace(m.group(0), m.group(1) + safe_url + m.group(3), 1)
        return result
