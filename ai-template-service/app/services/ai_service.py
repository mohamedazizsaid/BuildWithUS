import json
import logging
import os
import re

import httpx

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

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


class AiService:
    """Non-conversational AI helpers: color-palette suggestion and semantic
    column/field mapping. Email chat/generation now lives in the Next.js route
    /api/ai/chat (tool-based block generation)."""

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY is not set in environment variables")
        self.url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = os.getenv("AI_MODEL", "deepseek/deepseek-v3.2")

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
