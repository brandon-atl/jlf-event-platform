"""Shared utility functions."""

import re


def normalize_phone(phone: str | None) -> str | None:
    """Normalize a phone number to E.164 format (+1XXXXXXXXXX).

    Strips spaces, dashes, parens, dots. Adds +1 prefix for 10-digit US numbers.
    Returns None if input is None or empty.
    """
    if not phone:
        return None

    # Strip all non-digit characters except leading +
    has_plus = phone.startswith("+")
    digits = re.sub(r"\D", "", phone)

    if not digits:
        return None

    # If 10 digits, assume US number — add country code
    if len(digits) == 10:
        return f"+1{digits}"

    # If 11 digits starting with 1, assume US number
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"

    # Otherwise preserve with + prefix
    if has_plus:
        return f"+{digits}"

    return f"+{digits}"


def render_template_text(text: str, variables: dict[str, str]) -> str:
    """Replace {{variable}} placeholders with values."""
    def replacer(match):
        key = match.group(1).strip()
        return variables.get(key, match.group(0))
    return re.sub(r"\{\{(\w+)\}\}", replacer, text)
