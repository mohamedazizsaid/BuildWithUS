def validate_mjml(mjml: str) -> str:
    """
    Basic MJML validation.
    You can add more sophisticated checks or repair logic.
    """
    if not mjml.strip().startswith("<mjml>"):
        mjml = f"<mjml><mj-body>{mjml}</mj-body></mjml>"
    return mjml