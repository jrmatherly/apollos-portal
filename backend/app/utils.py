from __future__ import annotations

import re


def slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
