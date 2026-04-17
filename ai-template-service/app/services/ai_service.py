import os
import re
import json
import httpx
import logging
from app.utils.prompt_builder import build_prompt

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

IMAGE_SEARCH_API = os.getenv("IMAGE_SEARCH_API", "http://localhost:8002")

_GENERIC_ALT_WORDS = {"image", "photo", "picture", "placeholder", "avatar"}

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

    async def generate_template(self, prompt: str, **_kwargs):
        logger.info(f"[AI] Generating template — type detection running for: '{prompt[:80]}'")

        messages_payload = build_prompt(prompt)
        messages = [
            {"role": "system", "content": messages_payload["system"]},
            {"role": "user",   "content": messages_payload["user"]},
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 4096,
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
        mjml = await self._inject_stock_images(mjml, prompt)

        logger.info("[AI] Template generation complete")
        return {"mjml": mjml}

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
        """Replace placeholder src values with real Pexels photos."""
        src_pattern = re.compile(
            r'(<mj-image\b[^>]*?\bsrc=")([^"]*?)("[^>]*/?>)',
            re.IGNORECASE | re.DOTALL,
        )
        matches = list(src_pattern.finditer(mjml))
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
        for m, q in zip(matches, queries):
            url = image_map.get(q)
            if not url:
                continue
            safe_url = url.replace("&", "&amp;")
            result = result.replace(m.group(0), m.group(1) + safe_url + m.group(3), 1)
        return result
