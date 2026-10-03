"""Detect reasoning_effort from the public OpenAI model docs."""

from __future__ import annotations

import re
import time
import urllib.error
import urllib.parse
import urllib.request

from model.openai.constant import MODEL_DOC_URL, PRICING_CACHE_TTL_SECONDS

_SNAPSHOT = re.compile(r"-\d{4}-\d{2}-\d{2}$")
_cached: dict[str, tuple[float, bool]] = {}


def supports_reasoning(model_id: str) -> bool:
    """Return True when the model page documents reasoning effort."""
    chosen = (model_id or "").strip().lower()
    if not chosen:
        return False
    now = time.monotonic()
    cached = _cached.get(chosen)
    if cached is not None and now - cached[0] < PRICING_CACHE_TTL_SECONDS:
        return cached[1]
    supported = _read_model_page(chosen)
    _cached[chosen] = (now, supported)
    return supported


def _read_model_page(model_id: str) -> bool:
    """Fetch the model markdown and look for reasoning effort hints."""
    for slug in _doc_slugs(model_id):
        try:
            markdown = _fetch_markdown(slug)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            continue
        return _page_has_reasoning(markdown)
    return False


def _doc_slugs(model_id: str) -> list[str]:
    """Try the API id, then the same id without a dated snapshot suffix."""
    slugs = [model_id]
    stripped = _SNAPSHOT.sub("", model_id)
    if stripped and stripped not in slugs:
        slugs.append(stripped)
    return slugs


def _fetch_markdown(slug: str) -> str:
    """Download one model documentation page."""
    url = MODEL_DOC_URL.format(model=urllib.parse.quote(slug, safe="-._"))
    request = urllib.request.Request(url, headers={"User-Agent": "local-chatbot"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8")


def _page_has_reasoning(markdown: str) -> bool:
    """Return True when the docs mention reasoning effort or reasoning tokens."""
    lowered = markdown.lower()
    if "non-reasoning" in lowered:
        return False
    return "reasoning.effort" in lowered or "reasoning_effort" in lowered or "reasoning token support" in lowered
