#!/usr/bin/env python3
"""Generate llms.txt and llms-full.txt from Mintlify docs.

Parses docs.json for navigation structure, reads MDX frontmatter for
titles/descriptions, and strips Mintlify JSX components to plain markdown.

Usage:
    python scripts/generate_llms.py
    mise run docs:llms
"""

from __future__ import annotations

import json
import re
from pathlib import Path

DOCS_DIR = Path(__file__).parent.parent / "docs"
DOCS_JSON = DOCS_DIR / "docs.json"

SITE_TITLE = "Apollos AI"
SITE_SUMMARY = (
    "Self-service portal for managing LLM API access through Microsoft "
    "Entra ID. Users authenticate with their organizational identity, get "
    "provisioned into teams based on security group memberships, and manage "
    "API keys for LiteLLM proxy access."
)

# HTTP methods that indicate auto-generated OpenAPI pages (not MDX files)
OPENAPI_METHODS = ("GET ", "POST ", "PUT ", "PATCH ", "DELETE ")


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Extract YAML frontmatter and body from MDX content."""
    if not text.startswith("---"):
        return {}, text
    end = text.index("---", 3)
    fm_block = text[3:end].strip()
    body = text[end + 3 :].strip()
    meta: dict[str, str] = {}
    for line in fm_block.splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            meta[key.strip()] = val.strip().strip('"').strip("'")
    return meta, body


def strip_mdx_components(text: str) -> str:
    """Convert Mintlify JSX components to plain markdown."""
    # Step components → numbered list context
    text = re.sub(r"<Steps>\s*", "", text)
    text = re.sub(r"</Steps>\s*", "", text)
    text = re.sub(r'<Step\s+title="([^"]+)">\s*', r"**\1**\n\n", text)
    text = re.sub(r"</Step>\s*", "\n", text)

    # Tab components → bold headers
    text = re.sub(r"<Tabs>\s*", "", text)
    text = re.sub(r"</Tabs>\s*", "", text)
    text = re.sub(r'<Tab\s+title="([^"]+)">\s*', r"**\1:**\n\n", text)
    text = re.sub(r"</Tab>\s*", "\n", text)

    # Callout components → bold prefix
    for tag in ("Info", "Warning", "Note", "Tip", "Check"):
        text = re.sub(rf"<{tag}>\s*", f"**{tag}:** ", text)
        text = re.sub(rf"</{tag}>\s*", "\n\n", text)

    # Accordion → bold header
    text = re.sub(r'<Accordion\s+title="([^"]+)">\s*', r"**\1**\n\n", text)
    text = re.sub(r"</Accordion>\s*", "\n", text)

    # Card/CardGroup → remove (navigation-only elements)
    text = re.sub(r"<CardGroup[^>]*>\s*", "", text)
    text = re.sub(r"</CardGroup>\s*", "", text)
    text = re.sub(
        r'<Card\s+[^>]*href="([^"]*)"[^>]*>\s*(.*?)\s*</Card>',
        "",
        text,
        flags=re.DOTALL,
    )
    # Catch remaining Card tags
    text = re.sub(r"<Card[^>]*>.*?</Card>", "", text, flags=re.DOTALL)

    # CodeGroup → remove wrapper only
    text = re.sub(r"<CodeGroup>\s*", "", text)
    text = re.sub(r"</CodeGroup>\s*", "", text)

    # Remove any remaining self-closing or unknown JSX tags
    text = re.sub(r"<[A-Z][a-zA-Z]*\s*/>\s*", "", text)

    # Collapse excessive blank lines
    text = re.sub(r"\n{4,}", "\n\n\n", text)

    return text.strip()


def collect_pages(config: dict) -> list[tuple[str, list[tuple[str, str]]]]:
    """Extract (section_name, [(page_slug, ...)]) from docs.json navigation."""
    sections: list[tuple[str, list[tuple[str, str]]]] = []
    tabs = config.get("navigation", {}).get("tabs", [])

    for tab in tabs:
        groups = tab.get("groups", [])
        for group in groups:
            group_name = group.get("group", tab.get("tab", "Docs"))
            pages: list[tuple[str, str]] = []
            for page in group.get("pages", []):
                if isinstance(page, str) and not any(
                    page.startswith(m) for m in OPENAPI_METHODS
                ):
                    pages.append((page, page))
            if pages:
                sections.append((group_name, pages))

    return sections


def read_page(slug: str) -> tuple[str, str, str] | None:
    """Read an MDX page and return (title, description, body) or None."""
    mdx_path = DOCS_DIR / f"{slug}.mdx"
    if not mdx_path.exists():
        return None
    text = mdx_path.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(text)
    title = meta.get("title", slug)
    description = meta.get("description", "")
    return title, description, body


def generate_llms_txt(
    sections: list[tuple[str, list[tuple[str, str]]]],
) -> str:
    """Generate llms.txt content (directory listing)."""
    lines = [
        f"# {SITE_TITLE}",
        "",
        f"> {SITE_SUMMARY}",
        "",
    ]

    # Merge sections with the same name
    merged: dict[str, list[tuple[str, str]]] = {}
    order: list[str] = []
    for name, pages in sections:
        if name not in merged:
            merged[name] = []
            order.append(name)
        merged[name].extend(pages)

    for name in order:
        lines.append(f"## {name}")
        lines.append("")
        for slug, _ in merged[name]:
            result = read_page(slug)
            if result is None:
                continue
            title, description, _ = result
            entry = f"- [{title}](/{slug})"
            if description:
                entry += f": {description}"
            lines.append(entry)
        lines.append("")

    # Add OpenAPI spec reference
    openapi_path = DOCS_DIR / "api-reference" / "openapi.json"
    if openapi_path.exists():
        lines.append("## API specifications")
        lines.append("")
        lines.append("- [OpenAPI spec](/api-reference/openapi.json)")
        lines.append("")

    return "\n".join(lines)


def generate_llms_full_txt(
    sections: list[tuple[str, list[tuple[str, str]]]],
) -> str:
    """Generate llms-full.txt content (all docs in one file)."""
    lines = [
        f"# {SITE_TITLE}",
        "",
        f"> {SITE_SUMMARY}",
        "",
    ]

    seen: set[str] = set()
    for _, pages in sections:
        for slug, _ in pages:
            if slug in seen:
                continue
            seen.add(slug)
            result = read_page(slug)
            if result is None:
                continue
            title, _, body = result
            clean_body = strip_mdx_components(body)
            lines.append("---")
            lines.append("")
            lines.append(f"## {title}")
            lines.append("")
            lines.append(clean_body)
            lines.append("")

    return "\n".join(lines)


def main() -> None:
    config = json.loads(DOCS_JSON.read_text(encoding="utf-8"))
    sections = collect_pages(config)

    llms_txt = generate_llms_txt(sections)
    llms_full_txt = generate_llms_full_txt(sections)

    out_llms = DOCS_DIR / "llms.txt"
    out_full = DOCS_DIR / "llms-full.txt"

    out_llms.write_text(llms_txt, encoding="utf-8")
    out_full.write_text(llms_full_txt, encoding="utf-8")

    page_count = sum(len(p) for _, p in sections)
    print(f"Generated {out_llms.name} ({len(llms_txt)} bytes, {page_count} pages)")
    print(f"Generated {out_full.name} ({len(llms_full_txt)} bytes)")


if __name__ == "__main__":
    main()
