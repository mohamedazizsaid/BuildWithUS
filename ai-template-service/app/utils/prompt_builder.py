def build_prompt(user_prompt: str, tenant_id: str, examples: list = []):
    """
    Forces AI to generate MJML compatible with
    the Winaity Template Builder engine.
    """

    return f"""
You are an MJML TEMPLATE ENGINE.

You DO NOT invent structures.
You MUST follow Winaity Builder rules.

==============================
STRICT OUTPUT RULES
==============================

- Return ONLY valid MJML
- No explanations
- No markdown
- No comments
- No text outside <mjml>
- Must compile with MJML CLI

==============================
LAYOUT RULES
==============================

1. Always wrap with:

<mjml>
  <mj-body width="600px">
  ...
  </mj-body>
</mjml>

2. Use ONLY these components:

- mj-section
- mj-column
- mj-image
- mj-text
- mj-button

3. Columns must use explicit width:
33.33%, 50%, or 100%

4. Images MUST look like:

<mj-image
 src="http://localhost:9000/templates/{{tenant_id}}/IMAGE_ID.jpg"
 width="100%"
 padding="10px"
 align="center"
/>

5. Text blocks MUST include:

font-family
font-size
padding
align
color

6. Buttons MUST include:

background-color
border-radius
padding
font-weight

7. Always produce a modern marketing layout.

8. Include:
- multi-column cards section
- full width image section
- signature section

==============================
SIGNATURE FORMAT (MANDATORY)
==============================

<mj-text padding="20px 10px" font-size="16px" color="#000000">
<div style="border-top:1px solid #000000;width:200px;margin-bottom:8px;"></div>
<p style="margin:0;font-weight:bold">NAME</p>
<p style="margin:2px 0 0;opacity:0.7;font-size:0.85em">ROLE</p>
<p style="margin:2px 0 0;opacity:0.6;font-size:0.8em">EMAIL</p>
<p style="margin:2px 0 0;opacity:0.6;font-size:0.8em">PHONE</p>
</mj-text>

==============================
USER REQUEST
==============================

{user_prompt}

Generate MJML now.
"""