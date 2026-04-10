import os
import json
import httpx
import logging
from app.utils.prompt_builder import build_prompt

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class AiService:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY is not set in environment variables")
        self.url = "https://openrouter.ai/api/v1/chat/completions"

    async def generate_template(self, prompt: str, tenant_id: str, user_id: str, examples: list = []):
        """
        Generate valid MJML email template using AI
        """
        logger.info("Starting AI template generation")

        # Add strict MJML rules to prevent invalid output
        ai_prompt_rules = """
        Generate a valid MJML email template. Rules:
        - Only use <mjml>, <mj-body>, <mj-section>, <mj-column>, <mj-text>, <mj-button>, <mj-image>.
        - Inside <mj-text>, use ONLY plain text, <br />, <strong>, <em>, or <span> with inline styles.
        - Widths for <mj-column> and <mj-image> must be in px, never %.
        - Do NOT include <div>, <p>, <h1-h6>, or nested block tags inside <mj-text>.
        - Output only valid MJML, no HTML.
        """

        full_prompt = build_prompt(f"{ai_prompt_rules}\n{prompt}", tenant_id, examples)
        messages = [{"role": "user", "content": full_prompt}]
        payload = {
            "model": "deepseek/deepseek-v3.2",
            "messages": messages,
            "reasoning": {"enabled": True}
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    content=json.dumps(payload)
                )

                logger.info(f"OpenRouter status: {response.status_code}")

                try:
                    data = response.json()
                except json.JSONDecodeError:
                    logger.error("OpenRouter API did not return JSON")
                    return {"error": "OpenRouter API returned invalid response", "body": response.text}

                mjml = ""
                try:
                    mjml = "".join(
                        choice["message"]["content"]
                        for choice in data.get("choices", [])
                        if choice.get("message") and choice["message"].get("content")
                    )
                except Exception as e:
                    logger.error(f"Error parsing OpenRouter response: {e}")
                    return {"error": "Failed to parse OpenRouter response", "body": data}

        except Exception as e:
            logger.exception("Error calling OpenRouter API")
            return {"error": str(e)}

        # Sanitize MJML: remove invalid tags, replace % widths with px
        sanitized_mjml = self.sanitize_mjml(mjml)

        return {"mjml": sanitized_mjml}

    @staticmethod
    def sanitize_mjml(mjml: str) -> str:
        """
        Clean AI-generated MJML to ensure it validates correctly
        """
        import re

        # Remove block HTML tags
        for tag in ["div", "p"]:
            mjml = re.sub(fr"</?{tag}.*?>", "", mjml, flags=re.IGNORECASE)

        # Replace h1-h6 with strong + br
        for i in range(1, 7):
            mjml = re.sub(fr"<h{i}.*?>", "<strong>", mjml, flags=re.IGNORECASE)
            mjml = re.sub(fr"</h{i}>", "</strong><br />", mjml, flags=re.IGNORECASE)

        # Replace percentage widths with px (approximate)
        def width_px(match):
            val = int(match.group(1))
            px = max(1, int(val * 6))  # 1% ~ 6px for 600px container
            return f'width="{px}px"'

        mjml = re.sub(r'width="(\d+)%?"', width_px, mjml)

        # Remove trailing solidus issues on mj-image (self-close properly)
        mjml = re.sub(r'<mj-image([^>]*)\/?>', r'<mj-image\1 />', mjml)

        return mjml